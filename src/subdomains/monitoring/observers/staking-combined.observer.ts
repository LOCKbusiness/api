import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { AssetService } from 'src/shared/services/asset.service';
import { Util } from 'src/shared/util';
import { StakingTypes } from 'src/subdomains/staking/domain/entities/staking.entity';
import {
  DepositStatus,
  MasternodeState,
  RewardStatus,
  StakingStrategy,
  WithdrawalStatus,
} from 'src/subdomains/staking/domain/enums';
import { In, IsNull, Not } from 'typeorm';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface StakingData {
  balances: StakingBalance[];
  freeOperators: number;
  freeDepositAddresses: number;
  openDeposits: number;
  openWithdrawals: number;
  openRewards: number;
  lastOutputDates: LastOutputDates;
  rewardLiquidity: { [token: string]: number };
}

interface StakingBalance {
  strategy: StakingStrategy;
  asset: string;
  actual: number;
  should: number;
  difference: number;
}

type LastOutputDates = {
  [k in StakingStrategy]?: Date;
};

@Injectable()
export class StakingCombinedObserver extends MetricObserver<StakingData> {
  private client: WhaleClient;
  private tokenBalance = new Map<string, string>();

  constructor(
    private readonly repos: RepositoryFactory,
    private readonly assetService: AssetService,
    private readonly vaultService: VaultService,
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
      balances: await this.getStakingBalance(),
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
      openRewards: await this.repos.reward.countBy({ status: In([RewardStatus.READY, RewardStatus.PAYING_OUT]) }),
      lastOutputDates: await this.getLastOutputDates(),
      rewardLiquidity: {
        DFI: await this.getRewardLiquidity('DFI'),
        DUSD: await this.getRewardLiquidity('DUSD'),
      },
    };
  }

  private async getStakingBalance(): Promise<StakingBalance[]> {
    const stakingBalance = [] as StakingBalance[];

    const vaults = await this.vaultService.getAll();

    await this.addTokenBalance(Config.yieldMachine.liquidity.address);
    await this.addTokenBalance(Config.yieldMachine.rewardAddress);

    for (const vault of vaults) {
      await this.addTokenBalance(vault.address);

      if (vault.vault) {
        const vaultObject = await this.client.getVault(vault.vault);
        for (const token of vaultObject.collateralAmounts) {
          this.tokenBalance.set(token.symbol, token.amount);
        }
      }
    }

    for (const strategy of Object.values(StakingStrategy)) {
      for (const asset of StakingTypes[strategy]) {
        const assetObject = await this.assetService.getAssetByQuery(asset);

        if (strategy == StakingStrategy.MASTERNODE && asset.name == 'DFI') {
          // calculate actual balance
          const activeMasternodes = await this.repos.masternode.findBy({
            state: Not(In([MasternodeState.IDLE, MasternodeState.RESIGNED])),
          });
          const addresses = [...activeMasternodes.map((m) => m.owner), Config.staking.liquidity.address];
          const balance = await Promise.all(addresses.map((a) => this.client.getUtxoBalance(a).then((b) => +b)));
          const actual = Util.sum(balance);

          // calculate database balance
          const dbBalance = await this.getDbBalance(strategy, assetObject.id);

          // get unpaid masternode count
          const createdMasternodeCount = await this.repos.masternode.countBy({
            creationHash: Not(IsNull()),
          });
          const paidMasternodeCount = await this.repos.masternode.countBy({
            creationFeePaid: true,
          });

          // calculate should balance (database balance - unpaid creation fees)
          const should = dbBalance - (createdMasternodeCount - paidMasternodeCount) * Config.masternode.fee;

          // calculate difference
          const difference = Util.round(actual - should, Config.defaultVolumeDecimal);
          stakingBalance.push({ actual, should, difference, asset: asset.name, strategy });
        }

        const actual = +this.tokenBalance.get(asset.name);
        // calculate should balance
        const should = await this.getDbBalance(strategy, assetObject.id);

        // calculate difference
        const difference = actual - should;
        stakingBalance.push({ actual, should, difference, asset: asset.name, strategy });
      }
    }

    return stakingBalance;
  }

  private async addTokenBalance(address: string): Promise<void> {
    const addressTokens = await this.client.getTokenBalances(address);
    for (const token of addressTokens) {
      if (token.symbol.includes('-')) {
        const pool = await this.client.getPoolPair(token.id);

        const amountA = Math.sqrt(+pool.priceRatio.ab) * +token.amount;
        const amountB = Math.sqrt(+pool.priceRatio.ba) * +token.amount;

        this.tokenBalance.set(token.symbol.split('-')[0], amountA.toString());
        this.tokenBalance.set(token.symbol.split('-')[1], amountB.toString());
      } else {
        this.tokenBalance.set(token.symbol, token.amount);
      }
    }
  }

  private async getDbBalance(strategy: StakingStrategy, assetId: number): Promise<number> {
    return this.repos.staking
      .createQueryBuilder('staking')
      .leftJoin('staking.balances', 'balance')
      .select('SUM(balance.balance)', 'balance')
      .where('staking.strategy = :strategy', { strategy })
      .andWhere('balance.assetId= :assetId', { assetId })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
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

  private async getRewardLiquidity(token: string): Promise<number> {
    return this.client.getTokenBalance(Config.blockchain.default.rew.address, token).then((b) => b.toNumber());
  }
}
