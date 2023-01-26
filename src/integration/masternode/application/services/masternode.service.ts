import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Method } from 'axios';
import { Config, Process } from 'src/config/config';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import { SettingService } from 'src/shared/services/setting.service';
import { In, IsNull, LessThan, MoreThan, Not } from 'typeorm';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState, MasternodeTimeLock } from '../../../../subdomains/staking/domain/enums';
import { MasternodeState as BlockchainMasternodeState } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { MasternodeRepository } from '../repositories/masternode.repository';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Util } from 'src/shared/util';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { MasternodeOwnerService } from './masternode-owner.service';
import { MasternodeOwnerDto } from '../dto/masternode-owner.dto';

@Injectable()
export class MasternodeService {
  private client: DeFiClient;

  constructor(
    private readonly repository: MasternodeRepository,
    private readonly masternodeOwnerService: MasternodeOwnerService,
    private readonly http: HttpService,
    private readonly settingService: SettingService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.REW).subscribe((c) => (this.client = c));
  }

  // --- MASTERNODE SYNC --- //
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async syncMasternodes(): Promise<void> {
    if (Config.processDisabled(Process.MASTERNODE)) return;

    try {
      if (!Config.mydefichain.username) return;

      const masternodeOperators = await this.repository.find({
        select: ['operator'],
      });

      const masternodeServerList = await this.settingService.get('masternodeServerList');

      for (const server of masternodeServerList.split(',')) {
        const operators = await this.callApi<string[]>(`http://${server}.mydefichain.com/api/operatoraddresses`, 'GET');
        const missingOperators = operators.filter(
          (item) => masternodeOperators.map((masternode) => masternode.operator).indexOf(item) < 0,
        );

        for (const operator of missingOperators) {
          const newOperator = this.repository.create({ operator, server });
          await this.repository.save(newOperator);
        }
      }
    } catch (e) {
      console.error('Exception during masternode sync:', e);
    }
  }

  // --- MASTERNODE BLOCK CHECK --- //
  @Cron(CronExpression.EVERY_HOUR)
  async masternodeBlockCheck(): Promise<void> {
    if (Config.processDisabled(Process.MASTERNODE)) return;

    const masternodeWithoutBlocks = await this.repository.find({
      where: { state: Not(MasternodeState.RESIGNED), firstBlockFound: IsNull(), creationHash: Not(IsNull()) },
    });
    for (const masternode of masternodeWithoutBlocks) {
      try {
        const masternodeInfo = await this.client.getMasternodeInfo(masternode.creationHash);
        if (masternodeInfo.mintedBlocks > 0)
          await this.repository.update(masternode.id, { firstBlockFound: new Date() });
      } catch (e) {
        console.error(`Exception during masternode block check with masternode id: ${masternode.id}. Error:`, e);
      }
    }
  }

  // --- PUBLIC METHODS --- //
  async getAll(): Promise<Masternode[]> {
    return this.repository.find();
  }

  async getIdleMasternodes(count: number): Promise<Masternode[]> {
    const masternodes = await this.repository.find({
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

  async getNewOwners(count: number): Promise<MasternodeOwnerDto[]> {
    const masternodes = await this.repository.find({
      where: { owner: Not(IsNull()) },
    });
    const owners = this.masternodeOwnerService.provide(
      count,
      masternodes.map((m) => m.owner),
    );

    if (owners.length !== count) {
      console.error(`Could not get enough owners, requested ${count}, returning available: ${owners.length}`);
    }

    return owners;
  }

  async assignOwnersToMasternodes(
    owners: MasternodeOwnerDto[],
    masternodes: Masternode[],
    timeLock: MasternodeTimeLock,
  ): Promise<Masternode[]> {
    await Promise.all(
      masternodes.map((node, i) => {
        const info = owners[i];
        node.accountIndex = info.index;
        node.owner = info.address;
        node.ownerWallet = info.wallet;
        node.timeLock = timeLock;
        return this.repository.save(node);
      }),
    );

    return masternodes;
  }

  async getActiveCount(): Promise<number> {
    return this.repository.count({ where: { creationHash: Not(IsNull()), resignHash: IsNull() } });
  }

  async getActive(): Promise<Masternode[]> {
    return this.repository.find({ where: { creationHash: Not(IsNull()), resignHash: IsNull() } });
  }

  async getAllVotersAt(date: Date): Promise<Masternode[]> {
    return this.repository.find({
      where: [
        { firstBlockFound: LessThan(date), resignDate: IsNull() },
        { firstBlockFound: LessThan(date), resignDate: MoreThan(date) },
      ],
    });
  }

  async getAllWithStates(states: MasternodeState[]): Promise<Masternode[]> {
    return this.repository.find({
      where: {
        state: In(states),
      },
    });
  }

  async getAllResigning(): Promise<Masternode[]> {
    return this.getAllWithStates([
      MasternodeState.RESIGNING,
      MasternodeState.PRE_RESIGNED,
      MasternodeState.MOVING_COLLATERAL,
    ]);
  }

  async getOrderedForResigning(): Promise<Masternode[]> {
    const activeMasternodes = await this.getActive();

    // get TMS info
    const tmsInfo = await Promise.all(activeMasternodes.map((mn) => this.getMasternodeTms(mn.creationHash)));

    return activeMasternodes.sort((a, b) => {
      // 1. order by server
      if (a.server > b.server) return 1;
      if (a.server < b.server) return -1;

      // 2. order by TMS
      return (
        tmsInfo.find((tms) => tms.hash === a.creationHash).tms - tmsInfo.find((tms) => tms.hash === b.creationHash).tms
      );
    });
  }

  async getAllOwner(): Promise<string[]> {
    return this.getAll().then((masternodes) => masternodes.map((v) => v.owner).filter((o) => o));
  }

  async filterByBlockchainState(masternodes: Masternode[], state: BlockchainMasternodeState): Promise<Masternode[]> {
    const infos = await Promise.all(masternodes.map((mn) => this.getMasternodeStates(mn.creationHash)));
    return masternodes.filter((mn) => state === infos.find((info) => info.hash === mn.creationHash).state);
  }

  // get unpaid fee in DFI
  async getUnpaidFee(): Promise<number> {
    const unpaidMasternodeFee = await this.repository.count({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });
    return unpaidMasternodeFee * Config.masternode.fee;
  }

  // add masternode creationFee
  async addFee(paidFee: number): Promise<void> {
    const unpaidMasternodes = await this.repository.find({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });

    const paidMasternodeCount = Math.floor(paidFee / Config.masternode.fee);
    if (paidMasternodeCount !== paidFee / Config.masternode.fee)
      throw new BadRequestException(`Fee amount not divisible by ${Config.masternode.fee}`);

    for (const mn of unpaidMasternodes.slice(0, paidMasternodeCount)) {
      await this.repository.update(mn.id, { creationFeePaid: true });
    }
  }

  // --- LIFECYCLE METHODS --- //
  async enabling(
    id: number,
    owner: string,
    ownerWallet: string,
    timeLock: MasternodeTimeLock,
    accountIndex: number,
  ): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.ENABLING;
    masternode.owner = owner;
    masternode.ownerWallet = ownerWallet;
    masternode.timeLock = timeLock;
    masternode.accountIndex = accountIndex;

    await this.repository.save(masternode);
  }

  async preEnabled(id: number, txId: string): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.creationHash) throw new ConflictException('Masternode already created');

    masternode.state = MasternodeState.PRE_ENABLED;
    masternode.creationHash = txId;
    masternode.creationDate = new Date();

    await this.repository.save(masternode);
  }

  async enabled(id: number): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.ENABLED;

    await this.repository.save(masternode);
  }

  async resigning(id: number): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.state !== MasternodeState.ENABLED) throw new ConflictException('Masternode not yet created');

    masternode.state = MasternodeState.RESIGNING;

    await this.repository.save(masternode);
  }

  async preResigned(id: number, txId: string): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (!masternode.creationHash) throw new ConflictException('Masternode not yet created');
    if (masternode.resignHash) throw new ConflictException('Masternode already resigned');

    masternode.state = MasternodeState.PRE_RESIGNED;
    masternode.resignHash = txId;
    masternode.resignDate = new Date();

    await this.repository.save(masternode);
  }

  async movingCollateral(id: number): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.MOVING_COLLATERAL;

    await this.repository.save(masternode);
  }

  async resigned(id: number): Promise<void> {
    const masternode = await this.repository.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    masternode.state = MasternodeState.RESIGNED;

    await this.repository.save(masternode);
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
