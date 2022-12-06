import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { CoinTrackingCsvHistoryDto, CoinTrackingTransactionType } from '../dto/output/coin-tracking-history.dto';

export class CoinTrackingHistoryDtoMapper {
  static mapStakingDeposits(deposits: Deposit[]): CoinTrackingCsvHistoryDto[] {
    return deposits
      .filter((c) => c.status === DepositStatus.CONFIRMED)
      .map((c) => ({
        type: CoinTrackingTransactionType.DEPOSIT,
        buyAmount: c.amount,
        buyAsset: this.getAssetSymbolCT(c.asset),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: 'Staking',
        comment: 'LOCK Staking Deposit',
        txId: c.payInTxId,
        date: c.created,
        buyValueInEur: c.amountEur,
        sellValueInEur: null,
      }));
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): CoinTrackingCsvHistoryDto[] {
    return withdrawals
      .filter((c) => c.status === WithdrawalStatus.CONFIRMED)
      .map((c) => ({
        type: CoinTrackingTransactionType.WITHDRAWAL,
        buyAmount: null,
        buyAsset: null,
        sellAmount: c.amount,
        sellAsset: this.getAssetSymbolCT(c.asset),
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: null,
        comment: 'LOCK Staking Withdrawal',
        txId: c.withdrawalTxId,
        date: c.outputDate ?? c.updated,
        buyValueInEur: null,
        sellValueInEur: c.amountEur,
      }));
  }

  static mapStakingRewards(rewards: Reward[]): CoinTrackingCsvHistoryDto[] {
    return rewards
      .filter((c) => c.status === RewardStatus.CONFIRMED)
      .map((c) => ({
        type:
          c.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? CoinTrackingTransactionType.REWARD_BONUS
            : CoinTrackingTransactionType.STAKING,
        buyAmount: c.amount,
        buyAsset: this.getAssetSymbolCT(c.asset),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: c.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? null : 'Staking',
        comment:
          c.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? 'LOCK Yield Machine Reward' : 'LOCK Staking Reward',
        txId: c.reinvestTxId,
        date: c.reinvestOutputDate ?? c.updated,
        buyValueInEur: c.amountEur,
        sellValueInEur: null,
      }));
  }

  private static getAssetSymbolCT(asset: Asset): string {
    return asset.name === 'DUSD' ? 'DUSD4' : asset.category === AssetCategory.CRYPTO ? asset.name : `d${asset.name}`;
  }
}
