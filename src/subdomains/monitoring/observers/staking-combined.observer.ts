import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { MasternodeRepository } from 'src/integration/masternode/application/repositories/masternode.repository';
import { Util } from 'src/shared/util';
import { DepositRepository } from 'src/subdomains/staking/application/repositories/deposit.repository';
import { RewardRepository } from 'src/subdomains/staking/application/repositories/reward.repository';
import { StakingBlockchainAddressRepository } from 'src/subdomains/staking/application/repositories/staking-blockchain-address.repository';
import { StakingRepository } from 'src/subdomains/staking/application/repositories/staking.repository';
import { WithdrawalRepository } from 'src/subdomains/staking/application/repositories/withdrawal.repository';
import { DepositStatus, MasternodeState, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { getCustomRepository, In, IsNull, Not } from 'typeorm';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface StakingData {
  balance: { actual: number; should: number; difference: number };
  freeOperators: number;
  freeDepositAddresses: number;
  openDeposits: number;
  openWithdrawals: number;
  lastOutputDates: LastOutputDates;
}

type LastOutputDates = {
  [k in StakingStrategy]: Date;
};

@Injectable()
export class StakingCombinedObserver extends MetricObserver<StakingData> {
  private client: WhaleClient;

  constructor(monitoringService: MonitoringService, whaleService: WhaleService) {
    super(monitoringService, 'staking', 'combined');
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetch(): Promise<StakingData> {
    if (Config.processDisabled(Process.MONITORING)) return;

    try {
      const data = await this.getStaking();

      this.emit(data);

      return data;
    } catch (e) {
      console.error('Exception during monitoring staking combined:', e);
    }
  }

  // *** HELPER METHODS *** //

  private async getStaking(): Promise<StakingData> {
    return {
      balance: await this.getStakingBalance(),
      freeOperators: await getCustomRepository(MasternodeRepository).count({
        where: { creationHash: IsNull() },
      }),
      freeDepositAddresses: await getCustomRepository(StakingBlockchainAddressRepository)
        .createQueryBuilder('address')
        .leftJoin('address.staking', 'staking')
        .where('staking.id IS NULL')
        .getCount(),
      openDeposits: await getCustomRepository(DepositRepository).count({ where: { status: DepositStatus.PENDING } }),
      openWithdrawals: await getCustomRepository(WithdrawalRepository).count({
        where: { status: In([WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT]) },
      }),
      lastOutputDates: await this.getLastOutputDates(),
    };
  }

  private async getStakingBalance(): Promise<{ actual: number; should: number; difference: number }> {
    // calculate actual balance
    const activeMasternodes = await getCustomRepository(MasternodeRepository).find({
      where: {
        state: Not(In([MasternodeState.IDLE, MasternodeState.RESIGNED])),
      },
    });
    const addresses = [...activeMasternodes.map((m) => m.owner), Config.staking.liquidity.address];
    const balance = await Promise.all(addresses.map((a) => this.client.getUTXOBalance(a).then((b) => +b)));
    const actual = Util.sum(balance);

    // calculate database balance
    const dbBalance = await getCustomRepository(StakingRepository)
      .createQueryBuilder('staking')
      .leftJoin('staking.asset', 'asset')
      .select('SUM(balance)', 'balance')
      .where('asset.name = :name', { name: 'DFI' })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);

    // get unpaid masternodes
    const unpaidMasternodes = await getCustomRepository(MasternodeRepository).count({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });

    // calculate should balance (database balance - unpaid creation fees)

    const should = dbBalance - unpaidMasternodes * Config.masternode.fee;

    // calculate difference
    const difference = Util.round(actual - should, Config.defaultVolumeDecimal);
    return { actual, should, difference };
  }

  private async getLastOutputDates(): Promise<LastOutputDates> {
    const lastOutputDates = {};

    for (const strategy in StakingStrategy) {
      lastOutputDates[StakingStrategy[strategy]] = await this.getLastOutputDate(StakingStrategy[strategy]);
    }

    return lastOutputDates as LastOutputDates;
  }

  private async getLastOutputDate(strategy: StakingStrategy): Promise<Date> {
    return await getCustomRepository(RewardRepository)
      .findOne({
        order: { reinvestOutputDate: 'DESC' },
        where: { staking: { strategy } },
        relations: ['staking'],
      })
      .then((b) => b.reinvestOutputDate);
  }
}
