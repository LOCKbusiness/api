import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { CompactHistoryDto, CompactHistoryStatus, HistoryTransactionType } from '../dto/output/history.dto';

export class CompactHistoryDtoMapper {
  private static CompactStatusMapper: {
    [key in WithdrawalStatus | DepositStatus | RewardStatus]: CompactHistoryStatus | null;
  } = {
    [DepositStatus.OPEN]: null,
    [WithdrawalStatus.DRAFT]: null,
    [WithdrawalStatus.PENDING]: CompactHistoryStatus.PENDING,
    [WithdrawalStatus.PAYING_OUT]: CompactHistoryStatus.PENDING,
    [WithdrawalStatus.CONFIRMED]: CompactHistoryStatus.CONFIRMED,
    [WithdrawalStatus.FAILED]: CompactHistoryStatus.FAILED,
  };

  static mapStakingDeposits(deposits: Deposit[]): CompactHistoryDto[] {
    return deposits
      .map((c) => ({
        type: HistoryTransactionType.DEPOSIT,
        inputAmount: c.amount,
        inputAsset: c.asset.name,
        outputAmount: null,
        outputAsset: null,
        amountInEur: c.amountEur,
        amountInChf: c.amountChf,
        amountInUsd: c.amountUsd,
        txId: c.payInTxId,
        date: c.created,
        status: this.CompactStatusMapper[c.status],
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): CompactHistoryDto[] {
    return withdrawals
      .map((c) => ({
        type: HistoryTransactionType.WITHDRAWAL,
        inputAmount: null,
        inputAsset: null,
        outputAmount: c.amount,
        outputAsset: c.asset.name,
        amountInEur: c.amountEur,
        amountInChf: c.amountChf,
        amountInUsd: c.amountUsd,
        txId: c.withdrawalTxId,
        date: c.outputDate ?? c.updated,
        status: this.CompactStatusMapper[c.status],
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingRewards(rewards: Reward[]): CompactHistoryDto[] {
    return rewards
      .map((c) => ({
        type: HistoryTransactionType.REWARD,
        inputAmount: c.inputReferenceAmount,
        inputAsset: c.referenceAsset.name,
        outputAmount: null,
        outputAsset: null,
        amountInEur: c.amountEur,
        amountInChf: c.amountChf,
        amountInUsd: c.amountUsd,
        txId: c.txId,
        date: c.outputDate ?? c.updated,
        status: this.CompactStatusMapper[c.status],
      }))
      .filter((c) => c.status != null);
  }
}
