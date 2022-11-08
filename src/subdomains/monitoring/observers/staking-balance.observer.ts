import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { MasternodeRepository } from 'src/integration/masternode/application/repositories/masternode.repository';
import { Util } from 'src/shared/util';
import { DepositRepository } from 'src/subdomains/staking/application/repositories/deposit.repository';
import { StakingBlockchainAddressRepository } from 'src/subdomains/staking/application/repositories/staking-blockchain-address.repository';
import { StakingRepository } from 'src/subdomains/staking/application/repositories/staking.repository';
import { WithdrawalRepository } from 'src/subdomains/staking/application/repositories/withdrawal.repository';
import { DepositStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { getCustomRepository, IsNull, Not } from 'typeorm';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface StakingData {
  stakingBalance: { actual: number; should: number; difference: number };
  freeOperator: number;
  freeDeposits: number;
  openDeposits: number;
  openWithdrawals: number;
}

@Injectable()
export class StakingBalanceObserver extends MetricObserver<StakingData> {
  private client: WhaleClient;

  constructor(monitoringService: MonitoringService, whaleService: WhaleService) {
    super(monitoringService, 'staking', 'balance');
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Interval(900000)
  async fetch(): Promise<StakingData> {
    let data: StakingData;
    try {
      data = await this.getStaking();
    } catch (e) {
      data = this.getDefaultData();
    }

    this.emit(data);

    return data;
  }

  // *** HELPER METHODS *** //

  private async getStaking(): Promise<StakingData> {
    return {
      stakingBalance: await this.getStakingBalance(),
      freeOperator: await getCustomRepository(MasternodeRepository).count({
        where: { creationHash: IsNull() },
      }),
      freeDeposits: await getCustomRepository(StakingBlockchainAddressRepository)
        .createQueryBuilder('address')
        .leftJoin('address.staking', 'staking')
        .where('staking.id IS NULL')
        .getCount(),
      openDeposits: await getCustomRepository(DepositRepository).count({ where: { status: DepositStatus.PENDING } }),
      openWithdrawals: await getCustomRepository(WithdrawalRepository).count({
        where: [{ status: WithdrawalStatus.PENDING }, { status: WithdrawalStatus.PAYING_OUT }],
      }),
    };
  }

  private async getStakingBalance(): Promise<{ actual: number; should: number; difference: number }> {
    // calculate actual balance
    const activeMasternodes = await getCustomRepository(MasternodeRepository).find({
      where: {
        creationHash: Not(IsNull()),
        resignHash: IsNull(),
      },
    });
    const addresses = [...activeMasternodes.map((m) => m.owner), Config.staking.liquidity.address];
    const balance = await Promise.all(addresses.map((a) => this.client.getBalance(a).then((b) => +b)));
    const actual = Util.sum(balance);

    // calculate database balance
    const dbBalance = await getCustomRepository(StakingRepository)
      .createQueryBuilder('staking')
      .leftJoin('staking.asset', 'asset')
      .where('asset.name = :name', { name: 'DFI' })
      .select('SUM(balance)', 'balance')
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);

    // get unpaid masternodes
    const unpaidMasternodes = await getCustomRepository(MasternodeRepository).count({
      where: { creationHash: Not(IsNull()), creationFeePaid: false },
    });

    // calculate should balance (database balance - unpaid creation fees)

    const should = dbBalance - unpaidMasternodes * 10;

    // calculate difference
    const difference = Util.round(actual - should, Config.defaultVolumeDecimal);
    return { actual, should, difference };
  }

  private getDefaultData(): StakingData {
    return {
      stakingBalance: { actual: 0, should: 0, difference: 0 },
      freeOperator: 0,
      freeDeposits: 0,
      openDeposits: 0,
      openWithdrawals: 0,
    };
  }
}
