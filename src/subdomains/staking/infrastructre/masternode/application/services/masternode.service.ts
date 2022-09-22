import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Method } from 'axios';
import { Config } from 'src/config/config';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import { SettingService } from 'src/shared/services/setting.service';
import { IsNull, LessThan, MoreThan, Not } from 'typeorm';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState } from '../../../../domain/enums';
import { ResignMasternodeDto } from '../dto/resign-masternode.dto';
import { MasternodeRepository } from '../repositories/masternode.repository';
import { CreateMasternodeDto } from '../dto/create-masternode.dto';

@Injectable()
export class MasternodeService {
  constructor(
    private readonly masternodeRepo: MasternodeRepository,
    private readonly http: HttpService,
    private readonly settingService: SettingService,
  ) {}

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

  async get(): Promise<Masternode[]> {
    return this.masternodeRepo.find();
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

  //Get unpaid fee in DFI
  async getUnpaidFee(): Promise<number> {
    const unpaidMasternodeFee = await this.masternodeRepo.count({
      where: { creationFeePaid: false },
    });
    return unpaidMasternodeFee * 10;
  }

  async create(id: number, dto: CreateMasternodeDto): Promise<Masternode> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.creationHash) throw new ConflictException('Masternode already created');

    masternode.state = MasternodeState.CREATED;

    return await this.masternodeRepo.save({ ...masternode, ...dto });
  }

  async prepareResign(id: number, signature: string, masternodeState: MasternodeState): Promise<Masternode> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');

    if (masternodeState === MasternodeState.RESIGN_REQUESTED) {
      if (masternode.state !== MasternodeState.CREATED) throw new ConflictException('Masternode not yet created');
      masternode.signatureLiquidityManager = signature;
    }

    if (masternodeState === MasternodeState.RESIGN_CONFIRMED) {
      if (masternode.state !== MasternodeState.RESIGN_REQUESTED)
        throw new ConflictException('Masternode resign is not requested');
      masternode.signaturePayoutManager = signature;
    }

    masternode.state = masternodeState;

    return await this.masternodeRepo.save(masternode);
  }

  async resign(id: number, dto: ResignMasternodeDto): Promise<Masternode> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (!masternode.creationHash) throw new ConflictException('Masternode not yet created');
    if (masternode.resignHash) throw new ConflictException('Masternode already resigned');
    if (masternode.state !== MasternodeState.RESIGN_CONFIRMED)
      throw new ConflictException('Masternode resign is not confirmed');

    masternode.state = MasternodeState.RESIGNING;

    return await this.masternodeRepo.save({ ...masternode, ...dto });
  }

  async resigned(id: number): Promise<Masternode> {
    const masternode = await this.masternodeRepo.findOne(id);
    if (!masternode) throw new NotFoundException('Masternode not found');
    if (masternode.resignHash) throw new ConflictException('Masternode is not resigning');
    if (masternode.state !== MasternodeState.RESIGNING)
      throw new ConflictException('Masternode resigning has not started');

    masternode.state = MasternodeState.RESIGNED;

    return await this.masternodeRepo.save(masternode);
  }

  // --- HELPER METHODS --- //

  private async callApi<T>(url: string, method: Method = 'GET', data?: any): Promise<T> {
    return this.request<T>(url, method, data).catch((e: HttpError) => {
      throw new ServiceUnavailableException(e);
    });
  }

  private async request<T>(url: string, method: Method, data?: any): Promise<T> {
    return await this.http.request<T>({
      url,
      method: method,
      data: method !== 'GET' ? data : undefined,
      auth: { username: Config.mydefichain.username, password: Config.mydefichain.password },
      params: method === 'GET' ? data : undefined,
    });
  }
}
