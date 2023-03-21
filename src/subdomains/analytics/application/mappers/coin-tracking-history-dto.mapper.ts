import { Asset, AssetCategory } from 'src/shared/entities/asset.entity';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { CoinTrackingCsvHistoryDto, CoinTrackingTransactionType } from '../dto/output/coin-tracking-history.dto';

export class CoinTrackingHistoryDtoMapper {
  static mapStakingDeposits(deposits: Deposit[]): CoinTrackingCsvHistoryDto[] {
    return deposits
      .filter((d) => d.status === DepositStatus.CONFIRMED)
      .map((d) => ({
        type: CoinTrackingTransactionType.DEPOSIT,
        buyAmount: d.amount,
        buyAsset: this.getAssetSymbolCT(d.asset),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: d.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? 'LOCK.space YM' : 'LOCK.space Staking',
        tradeGroup: 'Staking',
        comment:
          d.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? 'LOCK Yield Machine Deposit'
            : 'LOCK Staking Deposit',
        date: d.created,
        txId: d.payInTxId,
        buyValueInEur: d.amountEur,
        sellValueInEur: null,
      }));
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): CoinTrackingCsvHistoryDto[] {
    return withdrawals
      .filter((w) => w.status === WithdrawalStatus.CONFIRMED)
      .map((w) => ({
        type: CoinTrackingTransactionType.WITHDRAWAL,
        buyAmount: null,
        buyAsset: null,
        sellAmount: w.amount,
        sellAsset: this.getAssetSymbolCT(w.asset),
        fee: null,
        feeAsset: null,
        exchange: w.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? 'LOCK.space YM' : 'LOCK.space Staking',
        tradeGroup: null,
        comment:
          w.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? 'LOCK Yield Machine Withdrawal'
            : 'LOCK Staking Withdrawal',
        date: w.outputDate ?? w.updated,
        txId: w.withdrawalTxId,
        buyValueInEur: null,
        sellValueInEur: w.amountEur,
      }));
  }

  static mapStakingRewards(rewards: Reward[], providerMap: Map<string, string>): CoinTrackingCsvHistoryDto[] {
    return rewards
      .filter((r) => r.status === RewardStatus.CONFIRMED)
      .map((r) => ({
        type:
          r.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? CoinTrackingTransactionType.REWARD_BONUS
            : CoinTrackingTransactionType.STAKING,
        buyAmount: r.targetAmount,
        buyAsset: this.getAssetSymbolCT(r.targetAsset),
        sellAmount: null,
        sellAsset: null,
        fee: r.feePercent != 0 ? (r.targetAmount * r.feePercent) / (1 - r.feePercent) : null,
        feeAsset: r.feePercent != 0 ? this.getAssetSymbolCT(r.targetAsset) : null,
        exchange: r.isReinvest
          ? r.staking.strategy === StakingStrategy.MASTERNODE
            ? 'LOCK.space Staking'
            : 'LOCK.space YM'
          : r.targetAddress.isEqual(r.staking.withdrawalAddress)
          ? providerMap.get(r.targetAddress.address)
          : 'External Wallet',
        tradeGroup: r.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? null : 'Staking',
        comment:
          r.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? `${r.referenceAsset.name} LOCK Yield Machine Reward`
            : 'LOCK Staking Reward',
        date: r.outputDate ?? r.updated,
        txId: r.txId,
        buyValueInEur: r.amountEur,
        sellValueInEur: null,
      }));
  }

  private static getAssetSymbolCT(asset: Asset): string {
    return asset.name === 'DUSD' ? 'DUSD4' : asset.category === AssetCategory.CRYPTO ? asset.name : `d${asset.name}`;
  }
}
