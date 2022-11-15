import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { CoinTrackingCsvHistoryDto } from '../dto/output/coin-tracking-history.dto';
import { CoinTrackingTransactionTypes } from '../services/staking-history.service';

export class CoinTrackingHistoryDtoMapper {
  static getStakingDepositHistoryCT(deposits: Deposit[]): CoinTrackingCsvHistoryDto[] {
    return deposits
      .filter((c) => c.status === DepositStatus.CONFIRMED)
      .map((c) => ({
        type: CoinTrackingTransactionTypes.DEPOSIT,
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

  static getStakingWithdrawalHistoryCT(withdrawals: Withdrawal[]): CoinTrackingCsvHistoryDto[] {
    return withdrawals
      .filter((c) => c.status === WithdrawalStatus.CONFIRMED)
      .map((c) => ({
        type: CoinTrackingTransactionTypes.WITHDRAWAL,
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

  static getStakingRewardHistoryCT(rewards: Reward[]): CoinTrackingCsvHistoryDto[] {
    return rewards
      .filter((c) => c.status === RewardStatus.CONFIRMED)
      .map((c) => ({
        type: CoinTrackingTransactionTypes.STAKING,
        buyAmount: c.amount,
        buyAsset: this.getAssetSymbolCT(c.asset),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: 'Staking',
        comment: 'LOCK Staking Deposit',
        txId: c.reinvestTxId,
        date: c.reinvestOutputDate ?? c.updated,
        buyValueInEur: c.amountEur,
        sellValueInEur: null,
      }));
  }

  static getAssetSymbolCT(asset: Asset): string {
    return asset.name === 'DUSD' ? 'DUSD4' : asset.category === AssetCategory.CRYPTO ? asset.name : `d${asset.name}`;
  }
}
