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
    [RewardStatus.CREATED]: CompactHistoryStatus.WAITING,
    [RewardStatus.READY]: CompactHistoryStatus.PENDING,
  };

  static mapStakingDeposits(deposits: Deposit[]): CompactHistoryDto[] {
    return deposits
      .map((d) => ({
        type: HistoryTransactionType.DEPOSIT,
        inputAmount: d.amount,
        inputAsset: d.asset.name,
        outputAmount: null,
        outputAsset: null,
        feeAmount: null,
        feeAsset: null,
        amountInEur: d.amountEur,
        amountInChf: d.amountChf,
        amountInUsd: d.amountUsd,
        txId: d.payInTxId,
        date: d.created,
        status: this.CompactStatusMapper[d.status],
        stakingStrategy: d.staking.strategy,
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): CompactHistoryDto[] {
    return withdrawals
      .map((w) => ({
        type: HistoryTransactionType.WITHDRAWAL,
        inputAmount: null,
        inputAsset: null,
        outputAmount: w.amount,
        outputAsset: w.asset.name,
        feeAmount: null,
        feeAsset: null,
        amountInEur: w.amountEur,
        amountInChf: w.amountChf,
        amountInUsd: w.amountUsd,
        txId: w.withdrawalTxId,
        date: w.outputDate ?? w.updated,
        status: this.CompactStatusMapper[w.status],
        stakingStrategy: w.staking.strategy,
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingRewards(rewards: Reward[]): CompactHistoryDto[] {
    return rewards
      .map((r) => ({
        type: HistoryTransactionType.REWARD,
        inputAmount: r.targetAmount,
        inputAsset: r.targetAsset.name,
        outputAmount: null,
        outputAsset: null,
        feeAmount: r.feePercent != 0 ? (r.targetAmount * r.feePercent) / (1 - r.feePercent) : null,
        feeAsset: r.feePercent != 0 ? r.targetAsset.name : null,
        amountInEur: r.amountEur,
        amountInChf: r.amountChf,
        amountInUsd: r.amountUsd,
        txId: r.txId,
        date: r.outputDate ?? r.updated,
        status: this.CompactStatusMapper[r.status],
        stakingStrategy: r.staking.strategy,
      }))
      .filter((c) => c.status != null);
  }
}
