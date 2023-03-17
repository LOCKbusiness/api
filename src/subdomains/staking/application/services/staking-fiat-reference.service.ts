import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Lock } from 'src/shared/lock';
import { Price } from 'src/shared/models/price';
import { IsNull } from 'typeorm';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, WithdrawalStatus } from '../../domain/enums';
import { PriceProvider, PRICE_PROVIDER } from '../interfaces';
import { DepositRepository } from '../repositories/deposit.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';

@Injectable()
export class StakingFiatReferenceService {
  constructor(
    private readonly depositRepo: DepositRepository,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly rewardRepo: RewardRepository,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(7200)
  async calculateFiatReferenceAmounts(): Promise<void> {
    const deposits = await this.getDepositsWithoutFiatReferences();
    const withdrawals = await this.getWithdrawalsWithoutFiatReferences();
    const rewards = await this.getRewardsWithoutFiatReferences();

    const relevantAssets = this.defineRelevantAssets(deposits, withdrawals, rewards);
    const prices = await this.getReferencePrices(relevantAssets);
    await this.calculateFiatReferences(deposits, withdrawals, rewards, prices);
  }

  //*** HELPER METHODS ***//

  private async getDepositsWithoutFiatReferences(): Promise<Deposit[]> {
    return this.depositRepo.findBy([
      { amountChf: IsNull(), status: DepositStatus.CONFIRMED },
      { amountUsd: IsNull(), status: DepositStatus.CONFIRMED },
      { amountEur: IsNull(), status: DepositStatus.CONFIRMED },
    ]);
  }

  private async getWithdrawalsWithoutFiatReferences(): Promise<Withdrawal[]> {
    return this.withdrawalRepo.findBy([
      { amountChf: IsNull(), status: WithdrawalStatus.CONFIRMED },
      { amountUsd: IsNull(), status: WithdrawalStatus.CONFIRMED },
      { amountEur: IsNull(), status: WithdrawalStatus.CONFIRMED },
    ]);
  }

  private async getRewardsWithoutFiatReferences(): Promise<Reward[]> {
    return this.rewardRepo.findBy([
      { amountChf: IsNull(), status: RewardStatus.CONFIRMED },
      { amountUsd: IsNull(), status: RewardStatus.CONFIRMED },
      { amountEur: IsNull(), status: RewardStatus.CONFIRMED },
    ]);
  }

  private defineRelevantAssets(deposits: Deposit[], withdrawals: Withdrawal[], rewards: Reward[]): number[] {
    return [
      ...new Set([
        ...deposits.map((d) => d.asset.id),
        ...withdrawals.map((w) => w.asset.id),
        ...rewards.map((r) => r.referenceAsset.id),
      ]),
    ];
  }

  private async getReferencePrices(uniqueAssetIds: number[]): Promise<Price[]> {
    const prices = [];

    for (const assetId of uniqueAssetIds) {
      for (const fiatName of Object.values(Fiat)) {
        try {
          const price = await this.priceProvider.getFiatPrice(fiatName, assetId);
          prices.push(price);
        } catch (e) {
          console.info(`Could not find fiat price for assetId ${assetId} and fiat '${fiatName}':`, e);
          continue;
        }
      }
    }

    return prices;
  }

  private async calculateFiatReferences(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
    prices: Price[],
  ): Promise<void> {
    await this.calculateFiatReferencesForDeposits(deposits, prices);
    await this.calculateFiatReferencesForWithdrawals(withdrawals, prices);
    await this.calculateFiatReferencesForRewards(rewards, prices);
  }

  private async calculateFiatReferencesForDeposits(deposits: Deposit[], prices: Price[]): Promise<void> {
    const confirmedDeposits = [];
    const failedDeposits = [];

    for (const deposit of deposits) {
      try {
        deposit.calculateFiatReferences(prices);
        await this.depositRepo.save(deposit);

        confirmedDeposits.push(deposit.id);
      } catch (e) {
        console.info(
          `Could not calculate fiat reference amount for Deposit Id: ${deposit.id}. Asset Id: ${deposit.asset.id}`,
          e,
        );
        failedDeposits.push(deposit.id);
        continue;
      }
    }

    confirmedDeposits.length > 0 &&
      console.info(
        `Successfully added fiat references to ${confirmedDeposits.length} deposit(s). Deposit Id(s):`,
        confirmedDeposits,
      );

    failedDeposits.length > 0 &&
      console.error(
        `Failed to add fiat references to ${failedDeposits.length} deposit(s). Deposit Id(s):`,
        failedDeposits,
      );
  }

  private async calculateFiatReferencesForWithdrawals(withdrawals: Withdrawal[], prices: Price[]): Promise<void> {
    const confirmedWithdrawals = [];
    const failedWithdrawals = [];

    for (const withdrawal of withdrawals) {
      try {
        withdrawal.calculateFiatReferences(prices);
        await this.withdrawalRepo.save(withdrawal);

        confirmedWithdrawals.push(withdrawal.id);
      } catch (e) {
        console.info(
          `Could not calculate fiat reference amount for Withdrawals Id: ${withdrawal.id}. Asset Id: ${withdrawal.asset.id}`,
          e,
        );
        failedWithdrawals.push(withdrawal.id);
        continue;
      }
    }

    confirmedWithdrawals.length > 0 &&
      console.info(
        `Successfully added fiat references to ${confirmedWithdrawals.length} withdrawal(s). Withdrawal Id(s):`,
        confirmedWithdrawals,
      );

    failedWithdrawals.length > 0 &&
      console.error(
        `Failed to add fiat references to ${failedWithdrawals.length} withdrawal(s). Withdrawal Id(s):`,
        failedWithdrawals,
      );
  }

  private async calculateFiatReferencesForRewards(rewards: Reward[], prices: Price[]): Promise<void> {
    const confirmedRewards = [];
    const failedRewards = [];

    for (const reward of rewards) {
      try {
        reward.calculateFiatReferences(prices);
        await this.rewardRepo.save(reward);

        confirmedRewards.push(reward.id);
      } catch (e) {
        console.info(
          `Could not calculate fiat reference amount for Reward Id: ${reward.id}. Asset Id: ${reward.referenceAsset.id}`,
          e,
        );
        failedRewards.push(reward.id);
        continue;
      }
    }

    confirmedRewards.length > 0 &&
      console.info(
        `Successfully added fiat references to ${confirmedRewards.length} reward(s). Reward Id(s):`,
        confirmedRewards,
      );

    failedRewards.length > 0 &&
      console.error(`Failed to add fiat references to ${failedRewards.length} reward(s). Reward Id(s):`, failedRewards);
  }
}
