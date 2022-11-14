import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';

export enum HistoryTransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD = 'Reward',
}

export enum CompactHistoryStatus {
  PENDING = 'Pending',
  PAYING_OUT = 'Pending',
  CONFIRMED = 'Confirmed',
  FAILED = 'Failed',
}

export class HistoryBaseDto {
  @ApiPropertyOptional()
  inputAmount: number;

  @ApiPropertyOptional()
  inputAsset: string;

  @ApiPropertyOptional()
  outputAmount: number;

  @ApiPropertyOptional()
  outputAsset: string;

  @ApiProperty()
  txId: string;

  @ApiProperty()
  date: Date;
}

export class CompactHistoryDto extends HistoryBaseDto {
  @ApiProperty({ enum: HistoryTransactionType })
  type: HistoryTransactionType;

  @ApiProperty({ enum: CompactHistoryStatus })
  status: CompactHistoryStatus;
}

export function getCompactStatus(
  status: WithdrawalStatus | DepositStatus | RewardStatus,
  type: 'Withdrawal' | 'Deposit' | 'Reward',
): CompactHistoryStatus {
  const currentStatusIndex = Object.entries(CompactHistoryStatus).find(
    (compactStatus) => getStatusName(status, type) === compactStatus[0],
  );

  return !currentStatusIndex ? null : currentStatusIndex[1];
}

export function isCompactStatus(
  status: WithdrawalStatus | DepositStatus | RewardStatus,
  type: 'Withdrawal' | 'Deposit' | 'Reward',
): boolean {
  return !!Object.entries(CompactHistoryStatus).find(
    (compactStatus) => getStatusName(status, type) === compactStatus[0],
  );
}

export function getStatusName(
  status: WithdrawalStatus | DepositStatus | RewardStatus,
  type: 'Withdrawal' | 'Deposit' | 'Reward',
): string {
  switch (type) {
    case 'Deposit':
      return Object.entries(DepositStatus).find((compactStatus) => status == compactStatus[1])[0];
    case 'Withdrawal':
      return Object.entries(WithdrawalStatus).find((compactStatus) => status == compactStatus[1])[0];
    case 'Reward':
      return Object.entries(RewardStatus).find((compactStatus) => status == compactStatus[1])[0];
  }
}
