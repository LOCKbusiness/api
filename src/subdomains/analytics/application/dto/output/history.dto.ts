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

export class HistoryBaseDto {
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

  @ApiProperty({ enum: StakingStrategy })
  stakingStrategy: StakingStrategy;
}
