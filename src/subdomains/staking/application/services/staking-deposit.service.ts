import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { Lock } from 'src/shared/lock';
import { Util } from 'src/shared/util';
import { TransactionDto } from 'src/subdomains/analytics/application/dto/output/transactions.dto';
import { PayInService } from 'src/subdomains/payin/application/services/payin.service';
import { PayIn, PayInPurpose } from 'src/subdomains/payin/domain/entities/payin.entity';
import { Between, LessThan } from 'typeorm';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { DepositStatus, StakingStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { DepositRepository } from '../repositories/deposit.repository';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingDepositForwardService } from './staking-deposit-forward-service';

@Injectable()
export class StakingDepositService {
  private readonly lock = new Lock(7200);
  private whaleClient?: WhaleClient;

  constructor(
    private readonly repository: StakingRepository,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly deFiChainStakingService: StakingDeFiChainService,
    private readonly payInService: PayInService,
    private readonly forwarder: StakingDepositForwardService,
    private readonly depositRepository: DepositRepository,
    whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    this.checkBlockchainDepositInputs();
  }

  //*** PUBLIC API ***//

  async getDeposits(dateFrom: Date = new Date(0), dateTo: Date = new Date()): Promise<TransactionDto[]> {
    const deposits = await this.depositRepository.find({
      relations: ['asset'],
      where: { created: Between(dateFrom, dateTo), status: DepositStatus.CONFIRMED },
    });

    return deposits.map((v) => ({
      id: v.id,
      date: v.created,
      amount: v.amount,
      asset: v.asset.displayName,
    }));
  }

  async createDeposit(
    userId: number,
    walletId: number,
    stakingId: number,
    dto: CreateDepositDto,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    const deposit = this.factory.createDeposit(staking, dto);

    staking.addDeposit(deposit);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  async checkBlockchainDepositInputs(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_DEPOSIT)) return;
    if (!this.lock.acquire()) return;

    try {
      await this.recordDepositTransactions();
      await this.forwarder.forwardDepositsToStaking();
    } catch (e) {
      console.error('Exception during staking deposit checks:', e);
    } finally {
      this.lock.release();
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanUpPendingDeposits(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_DEPOSIT)) return;

    try {
      const pendingDeposits = await this.depositRepository.find({
        where: { status: DepositStatus.PENDING, updated: LessThan(Util.daysBefore(1)) },
      });
      for (const deposit of pendingDeposits) {
        const txId = await this.whaleClient.getTx(deposit.payInTxId).catch(() => null);
        if (!txId) await this.depositRepository.update(deposit.id, { status: DepositStatus.FAILED });
      }
    } catch (e) {
      console.error('Exception during cleanup deposit:', e);
    }
  }

  //*** HELPER METHODS ***//

  private async recordDepositTransactions(): Promise<void> {
    const newPayInTransactions = await this.payInService.getNewPayInTransactions();

    if (!newPayInTransactions) return;

    const stakingPayIns = await this.filterStakingPayIns(newPayInTransactions);
    const stakingPairs = await this.getStakingsForPayIns(stakingPayIns);

    await this.processNewDeposits(stakingPairs);
  }

  private async filterStakingPayIns(allPayIns: PayIn[]): Promise<PayIn[]> {
    const stakingAddresses = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.depositAddress', 'depositAddress')
      .select('depositAddress.address', 'address')
      .where('staking.status != :status', { status: StakingStatus.BLOCKED })
      .getRawMany<{ address: string }>()
      .then((a) => a.map((a) => a.address));

    return allPayIns.filter((p) => stakingAddresses.includes(p.address.address));
  }

  private async getStakingsForPayIns(stakingPayIns: PayIn[]): Promise<[number, PayIn][]> {
    const stakingPairs: [number, PayIn][] = [];

    for (const payIn of stakingPayIns) {
      const staking = await this.repository.findOne({
        depositAddress: { address: payIn.address.address, blockchain: payIn.address.blockchain },
      });

      stakingPairs.push([staking.id, payIn]);
    }

    return stakingPairs;
  }

  private async processNewDeposits(stakingPairs: [number, PayIn][]): Promise<void> {
    for (const [stakingId, payIn] of stakingPairs) {
      try {
        const staking = await this.repository.findOne({ where: { id: stakingId } });
        const payInValid = staking.getConfirmedDeposits().length > 0 || (await this.isFirstPayInValid(staking, payIn));

        if (payInValid) {
          this.createOrUpdateDeposit(staking, payIn);
        } else {
          console.error(`Invalid first pay in, staking ${staking.id} is blocked`);
          staking.block();
        }

        await this.repository.save(staking);
        await this.payInService.acknowledgePayIn(payIn, PayInPurpose.STAKING);
      } catch (e) {
        console.error(`Failed to process deposit input ${payIn.id}:`, e);
      }
    }
  }

  private async isFirstPayInValid(staking: Staking, payIn: PayIn): Promise<boolean> {
    const addresses = await this.deFiChainStakingService.getSourceAddresses(payIn.txId);
    return staking.verifyUserAddresses(addresses);
  }

  private createOrUpdateDeposit(staking: Staking, payIn: PayIn): void {
    const deposit = staking.getDepositByPayInTxId(payIn.txId) ?? this.createNewDeposit(staking, payIn);

    deposit.updatePreCreatedDeposit(payIn.txId, payIn.amount);
  }

  private createNewDeposit(staking: Staking, payIn: PayIn): Deposit {
    const newDeposit = this.factory.createDeposit(staking, { amount: payIn.amount, txId: payIn.txId });

    staking.addDeposit(newDeposit);

    return newDeposit;
  }

  // Analytics

  async getDeposits(dateFrom: Date = new Date(0), dateTo: Date = new Date()): Promise<TransactionDto[]> {
    const deposits = await this.depositRepository.find({
      relations: ['asset'],
      where: { created: Between(dateFrom, dateTo), status: DepositStatus.CONFIRMED },
    });

    return deposits.map((v) => ({
      id: v.id,
      date: v.created,
      amount: v.amount,
      asset: v.asset.displayName,
    }));
  }
}
