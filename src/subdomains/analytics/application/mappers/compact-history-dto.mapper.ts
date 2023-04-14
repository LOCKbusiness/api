import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DepositStatus, RewardStatus, StakingStrategy, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import {
  CompactHistoryDto,
  CompactHistoryStatus,
  CompactHistoryType,
  CompactHistoryTransactionType,
} from '../dto/output/history.dto';

export class CompactHistoryDtoMapper {
  private static CompactStatusMapper: {
    [key in WithdrawalStatus | DepositStatus | RewardStatus]: CompactHistoryStatus | null;
  } = {
    [DepositStatus.OPEN]: null,
    [DepositStatus.INVALID]: CompactHistoryStatus.FAILED,
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
        type: CompactHistoryTransactionType.DEPOSIT,
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
        source: null,
        target: this.getType(d.staking.strategy),
        targetAddress: d.staking.depositAddress.address,
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingWithdrawals(withdrawals: Withdrawal[]): CompactHistoryDto[] {
    return withdrawals
      .map((w) => ({
        type: CompactHistoryTransactionType.WITHDRAWAL,
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
        source: this.getType(w.staking.strategy),
        target: CompactHistoryType.WALLET,
        targetAddress: w.staking.withdrawalAddress.address,
      }))
      .filter((c) => c.status != null);
  }

  static mapStakingRewards(rewards: Reward[], depositAddressMap: Map<string, StakingStrategy>): CompactHistoryDto[] {
    return rewards
      .map((r) => ({
        type: CompactHistoryTransactionType.REWARD,
        inputAmount: r.targetAmount ?? r.approxTargetAmount,
        inputAsset: r.targetAsset.name,
        outputAmount: null,
        outputAsset: null,
        feeAmount: r.feePercent && r.feePercent != 0 ? (r.targetAmount * r.feePercent) / (1 - r.feePercent) : null,
        feeAsset: r.feePercent && r.feePercent != 0 ? r.targetAsset.name : null,
        amountInEur: r.amountEur,
        amountInChf: r.amountChf,
        amountInUsd: r.amountUsd,
        txId: r.txId,
        date: r.outputDate ?? r.updated,
        status: this.CompactStatusMapper[r.status],
        source: this.getType(r.staking.strategy),
        target: depositAddressMap.has(r.targetAddress.address)
          ? this.getType(depositAddressMap.get(r.targetAddress.address))
          : r.targetAddress.isEqual(r.staking.withdrawalAddress)
          ? CompactHistoryType.WALLET
          : CompactHistoryType.EXTERNAL,
        targetAddress: r.targetAddress.address,
      }))
      .filter((c) => c.status != null);
  }

  private static getType(strategy: StakingStrategy): CompactHistoryType {
    return strategy === StakingStrategy.MASTERNODE
      ? CompactHistoryType.MASTERNODE
      : CompactHistoryType.LIQUIDITY_MINING;
  }
}
