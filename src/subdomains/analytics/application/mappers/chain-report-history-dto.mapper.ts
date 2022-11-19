import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { ChainReportCsvHistoryDto, ChainReportTransactionType } from '../dto/output/chain-report-history.dto';

export class ChainReportHistoryDtoMapper {
  static mapStakingDeposits(deposits: Deposit[]): ChainReportCsvHistoryDto[] {
    return deposits
      .filter((c) => c.status === DepositStatus.CONFIRMED)
      .map((c) => ({
        timestamp: c.created,
        transactionType: ChainReportTransactionType.DEPOSIT,
        inputAmount: c.amount,
        inputAsset: this.getAssetSymbolChainReport(c.asset),
        outputAmount: null,
        outputAsset: null,
        feeAmount: null,
        feeAsset: null,
        txId: c.payInTxId,
        description: 'LOCK Staking Deposit',
      }));
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): ChainReportCsvHistoryDto[] {
    return withdrawals
      .filter((c) => c.status === WithdrawalStatus.CONFIRMED)
      .map((c) => ({
        timestamp: c.outputDate ?? c.updated,
        transactionType: ChainReportTransactionType.WITHDRAWAL,
        inputAmount: null,
        inputAsset: null,
        outputAmount: c.amount,
        outputAsset: this.getAssetSymbolChainReport(c.asset),
        feeAmount: null,
        feeAsset: null,
        txId: c.withdrawalTxId,
        description: 'LOCK Staking Withdrawal',
      }));
  }

  static mapStakingRewards(rewards: Reward[]): ChainReportCsvHistoryDto[] {
    return rewards
      .filter((c) => c.status === RewardStatus.CONFIRMED)
      .map((c) => ({
        timestamp: c.reinvestOutputDate ?? c.updated,
        transactionType: ChainReportTransactionType.STAKING,
        inputAmount: c.amount,
        inputAsset: this.getAssetSymbolChainReport(c.asset),
        outputAmount: null,
        outputAsset: null,
        feeAmount: null,
        feeAsset: null,
        txId: c.reinvestTxId,
        description: 'LOCK Staking Reward',
      }));
  }

  private static getAssetSymbolChainReport(asset: Asset): string {
    return asset.category === AssetCategory.CRYPTO ? asset.name : `d${asset.name}`;
  }
}
