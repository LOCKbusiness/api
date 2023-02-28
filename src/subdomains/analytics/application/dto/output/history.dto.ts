import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export enum HistoryTransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD = 'Reward',
}

export enum CompactHistoryStatus {
  WAITING = 'WaitingForBalance',
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  FAILED = 'Failed',
}

export enum CompactHistoryTarget {
  REINVEST = 'Reinvest',
  WALLET = 'Wallet',
  EXTERNAL = 'External',
}

export class CompactHistoryDto {
  @ApiPropertyOptional()
  inputAmount: number;

  @ApiPropertyOptional()
  inputAsset: string;

  @ApiPropertyOptional()
  outputAmount: number;

  @ApiPropertyOptional()
  outputAsset: string;

  @ApiPropertyOptional()
  feeAmount: number;

  @ApiPropertyOptional()
  feeAsset: string;

  @ApiPropertyOptional()
  amountInEur: number;

  @ApiPropertyOptional()
  amountInChf: number;

  @ApiPropertyOptional()
  amountInUsd: number;

  @ApiPropertyOptional()
  payoutTarget: CompactHistoryTarget;

  @ApiProperty()
  txId: string;

  @ApiProperty()
  date: Date;

  @ApiProperty({ enum: HistoryTransactionType })
  type: HistoryTransactionType;

  @ApiProperty({ enum: CompactHistoryStatus })
  status: CompactHistoryStatus;

  @ApiProperty({ enum: StakingStrategy })
  stakingStrategy: StakingStrategy;
}
