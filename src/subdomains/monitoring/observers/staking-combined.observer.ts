import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { Util } from 'src/shared/util';
import { DepositStatus, MasternodeState, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { In, IsNull, Not } from 'typeorm';
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
  [k in StakingStrategy]?: Date;
};

@Injectable()
export class StakingCombinedObserver extends MetricObserver<StakingData> {
  private client: WhaleClient;

  constructor(
    private readonly repos: RepositoryFactory,
    monitoringService: MonitoringService,
    whaleService: WhaleService,
  ) {
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
      freeOperators: await this.repos.masternode.countBy({ creationHash: IsNull() }),
      freeDepositAddresses: await this.repos.reservableBlockchainAddress
        .createQueryBuilder('address')
        .leftJoin('address.reservation', 'reservation')
        .where('reservation.id IS NULL')
        .getCount(),
      openDeposits: await this.repos.deposit.countBy({ status: DepositStatus.PENDING }),
      openWithdrawals: await this.repos.withdrawal.countBy({
        status: In([WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT]),
      }),
      lastOutputDates: await this.getLastOutputDates(),
    };
  }

  private async getStakingBalance(): Promise<{ actual: number; should: number; difference: number }> {
    // calculate actual balance
    const activeMasternodes = await this.repos.masternode.findBy({
      state: Not(In([MasternodeState.IDLE, MasternodeState.RESIGNED])),
    });
    const addresses = [...activeMasternodes.map((m) => m.owner), Config.staking.liquidity.address];
    const balance = await Promise.all(addresses.map((a) => this.client.getUtxoBalance(a).then((b) => +b)));
    const actual = Util.sum(balance);

    // calculate database balance
    const dbBalance = await this.repos.staking
      .createQueryBuilder('staking')
      .leftJoin('staking.asset', 'asset')
      .select('SUM(balance)', 'balance')
      .where('asset.name = :name', { name: 'DFI' })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);

    // get unpaid masternodes
    const unpaidMasternodes = await this.repos.masternode.countBy({
      creationHash: Not(IsNull()),
      creationFeePaid: false,
    });

    // calculate should balance (database balance - unpaid creation fees)

    const should = dbBalance - unpaidMasternodes * Config.masternode.fee;

    // calculate difference
    const difference = Util.round(actual - should, Config.defaultVolumeDecimal);
    return { actual, should, difference };
  }

  private async getLastOutputDates(): Promise<LastOutputDates> {
    const lastOutputDates: LastOutputDates = {};

    for (const strategy of Object.values(StakingStrategy)) {
      lastOutputDates[strategy] = await this.getLastOutputDate(strategy);
    }

    return lastOutputDates;
  }

  private async getLastOutputDate(strategy: StakingStrategy): Promise<Date> {
    return this.repos.reward
      .findOne({
        order: { outputDate: 'DESC' },
        where: { staking: { strategy } },
        relations: ['staking'],
      })
      .then((b) => b?.outputDate);
  }
}
