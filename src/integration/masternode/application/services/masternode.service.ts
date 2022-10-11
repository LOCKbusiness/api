import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Method } from 'axios';
import { Config } from 'src/config/config';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import { SettingService } from 'src/shared/services/setting.service';
import { In, IsNull, LessThan, MoreThan, Not } from 'typeorm';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState } from '../../../../subdomains/staking/domain/enums';
import { MasternodeState as BlockchainMasternodeState } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { MasternodeRepository } from '../repositories/masternode.repository';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Util } from 'src/shared/util';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';

@Injectable()
export class MasternodeService {
  private client: DeFiClient;

  constructor(
    private readonly masternodeRepo: MasternodeRepository,
    private readonly http: HttpService,
    private readonly settingService: SettingService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((c) => (this.client = c));
  }

  // --- MASTERNODE SYNC --- //
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncMasternodes(): Promise<void> {
    if (!Config.mydefichain.username) return;

    const masternodeOperators = await this.masternodeRepo.find({
      select: ['operator'],
    });

    const masternodeServerList = await this.settingService.get('masternodeServerList');

    for (const server of masternodeServerList.split(',')) {
      const operators = await this.callApi<string[]>(`http://${server}.mydefichain.com/api/operatoraddresses`, 'GET');
      const missingOperators = operators.filter(
        (item) => masternodeOperators.map((masternode) => masternode.operator).indexOf(item) < 0,
      );

      for (const operator of missingOperators) {
        const newOperator = this.masternodeRepo.create({ operator, server });
        await this.masternodeRepo.save(newOperator);
      }
    }
  }

  async getIdleMasternodes(count: number): Promise<Masternode[]> {
    const masternodes = await this.masternodeRepo.find({
      where: { state: MasternodeState.IDLE },
      take: count,
    });

    if (masternodes.length !== count) {
      console.error(
        `Could not get enough idle masternodes, requested ${count}, returning available: ${masternodes.length}`,
      );
    }

    return masternodes;
  }

  async getActiveCount(date: Date = new Date()): Promise<number> {
    return this.masternodeRepo.count({
      where: [
        { creationDate: LessThan(date), resignDate: IsNull() },
        { creationDate: LessThan(date), resignDate: MoreThan(date) },
      ],
    });
  }

  async getActive(): Promise<Masternode[]> {
    return this.masternodeRepo.find({ where: { creationHash: Not(IsNull()), resignHash: IsNull() } });
  }

  async getAllWithStates(states: MasternodeState[]): Promise<Masternode[]> {
    return this.masternodeRepo.find({
      where: {
        state: In(states),
      },
    });
  }

  async getAllResigning(): Promise<Masternode[]> {
    return this.masternodeRepo.find({
      where: {
        state: In([MasternodeState.RESIGNING, MasternodeState.PRE_RESIGNED]),
      },
    });
  }

  async getOrderedByTms(): Promise<Masternode[]> {
    const activeMasternodes = await this.getActive();

    // get TMS info
    const tmsInfo = await Promise.all(activeMasternodes.map((mn) => this.getMasternodeTms(mn.creationHash)));

    return activeMasternodes.sort(
      (a, b) =>
        tmsInfo.find((tms) => tms.hash === a.creationHash).tms - tmsInfo.find((tms) => tms.hash === b.creationHash).tms,
    );
  }

  async filterByBlockchainState(masternodes: Masternode[], state: BlockchainMasternodeState): Promise<Masternode[]> {
    const infos = await Promise.all(masternodes.map((mn) => this.getMasternodeStates(mn.creationHash)));
    return masternodes.filter((mn) => state === infos.find((info) => info.hash === mn.creationHash).state);
  }

  // get unpaid fee in DFI
  async getUnpaidFee(): Promise<number> {
    const unpaidMasternodeFee = await this.masternodeRepo.count({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });
    return unpaidMasternodeFee * 10;
  }

  // add masternode creationFee
  async addFee(paidFee: number): Promise<void> {
    const unpaidMasternodes = await this.masternodeRepo.find({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });

    const paidMasternodeCount = Math.floor(paidFee / Config.masternode.fee);
    if (paidMasternodeCount !== paidFee / Config.masternode.fee)
      throw new BadRequestException(`Fee amount not divisible by ${Config.masternode.fee}`);

    for (const mn of unpaidMasternodes.slice(0, paidMasternodeCount)) {
      await this.masternodeRepo.update(mn.id, { creationFeePaid: true });
    }
  }

  async enabling(id: number): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.ENABLING;

    await this.masternodeRepo.save(masternode);
  }

  async preEnabled(id: number, txId: string): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.creationHash) throw new ConflictException('Masternode already created');

    masternode.state = MasternodeState.PRE_ENABLED;
    masternode.creationHash = txId;
    masternode.creationDate = new Date();

    await this.masternodeRepo.save(masternode);
  }

  async enabled(id: number): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.ENABLED;

    await this.masternodeRepo.save(masternode);
  }

  async resigning(id: number): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.state !== MasternodeState.ENABLED) throw new ConflictException('Masternode not yet created');

    masternode.state = MasternodeState.RESIGNING;

    await this.masternodeRepo.save(masternode);
  }

  async preResigned(id: number, txId: string): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (!masternode.creationHash) throw new ConflictException('Masternode not yet created');
    if (masternode.resignHash) throw new ConflictException('Masternode already resigned');

    masternode.state = MasternodeState.PRE_RESIGNED;
    masternode.resignHash = txId;
    masternode.resignDate = new Date();

    await this.masternodeRepo.save(masternode);
  }

  async resigned(id: number): Promise<void> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.RESIGNED;

    await this.masternodeRepo.save(masternode);
  }

  // --- HELPER METHODS --- //

  private async callApi<T>(url: string, method: Method = 'GET', data?: any): Promise<T> {
    return this.request<T>(url, method, data).catch((e: HttpError) => {
      throw new ServiceUnavailableException(e);
    });
  }

  private async request<T>(url: string, method: Method, data?: any): Promise<T> {
    return this.http.request<T>({
      url,
      method: method,
      data: method !== 'GET' ? data : undefined,
      auth: { username: Config.mydefichain.username, password: Config.mydefichain.password },
      params: method === 'GET' ? data : undefined,
    });
  }

  private async getMasternodeTms(creationHash: string): Promise<{ hash: string; tms: number }> {
    const info = await this.client.getMasternodeInfo(creationHash);
    return { hash: creationHash, tms: Util.avg(info.targetMultipliers ?? []) };
  }

  private async getMasternodeStates(creationHash: string): Promise<{ hash: string; state: BlockchainMasternodeState }> {
    const info = await this.client.getMasternodeInfo(creationHash);
    return { hash: creationHash, state: info.state };
  }
}
