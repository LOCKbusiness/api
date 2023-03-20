import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import {
  ChainReportCsvHistoryDto,
  ChainReportTarget,
  ChainReportTransactionType,
} from '../dto/output/chain-report-history.dto';

export class ChainReportHistoryDtoMapper {
  static mapStakingDeposits(deposits: Deposit[]): ChainReportCsvHistoryDto[] {
    return deposits
      .filter((d) => d.status === DepositStatus.CONFIRMED)
      .map((d) => ({
        timestamp: d.created,
        transactionType: ChainReportTransactionType.DEPOSIT,
        inputAmount: d.amount,
        inputAsset: this.getAssetSymbolChainReport(d.asset),
        outputAmount: null,
        outputAsset: null,
        feeAmount: null,
        feeAsset: null,
        txId: d.payInTxId,
        description:
          d.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? 'LOCK Yield Machine Deposit'
            : 'LOCK Staking Deposit',
        isReinvest: null,
        target:
          d.staking.strategy === StakingStrategy.LIQUIDITY_MINING ? ChainReportTarget.YM : ChainReportTarget.STAKING,
      }));
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): ChainReportCsvHistoryDto[] {
    return withdrawals
      .filter((w) => w.status === WithdrawalStatus.CONFIRMED)
      .map((w) => ({
        timestamp: w.outputDate ?? w.updated,
        transactionType: ChainReportTransactionType.WITHDRAWAL,
        inputAmount: null,
        inputAsset: null,
        outputAmount: w.amount,
        outputAsset: this.getAssetSymbolChainReport(w.asset),
        feeAmount: null,
        feeAsset: null,
        txId: w.withdrawalTxId,
        description:
          w.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? 'LOCK Yield Machine Withdrawal'
            : 'LOCK Staking Withdrawal',
        isReinvest: null,
        target: ChainReportTarget.WALLET,
      }));
  }

  static mapStakingRewards(
    rewards: Reward[],
    depositAddressMap: Map<string, StakingStrategy>,
  ): ChainReportCsvHistoryDto[] {
    return rewards
      .filter((r) => r.status === RewardStatus.CONFIRMED)
      .map((r) => ({
        timestamp: r.outputDate ?? r.updated,
        transactionType:
          r.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? ChainReportTransactionType.LM
            : ChainReportTransactionType.STAKING,
        inputAmount: r.targetAmount,
        inputAsset: this.getAssetSymbolChainReport(r.targetAsset),
        outputAmount: null,
        outputAsset: null,
        feeAmount: r.feePercent != 0 ? (r.targetAmount * r.feePercent) / (1 - r.feePercent) : null,
        feeAsset: r.feePercent != 0 ? this.getAssetSymbolChainReport(r.targetAsset) : null,
        txId: r.txId,
        description:
          r.staking.strategy === StakingStrategy.LIQUIDITY_MINING
            ? `${r.referenceAsset.name} LOCK Yield Machine Reward`
            : 'LOCK Staking Reward',
        isReinvest: r.isReinvest,
        target: depositAddressMap.has(r.targetAddress.address)
          ? depositAddressMap.get(r.targetAddress.address) === StakingStrategy.MASTERNODE
            ? ChainReportTarget.STAKING
            : ChainReportTarget.YM
          : r.targetAddress.isEqual(r.staking.withdrawalAddress)
          ? ChainReportTarget.WALLET
          : ChainReportTarget.EXTERNAL,
      }));
  }

  private static getAssetSymbolChainReport(asset: Asset): string {
    return asset.name === 'DUSD' || asset.category === AssetCategory.CRYPTO ? asset.name : `d${asset.name}`;
  }
}
