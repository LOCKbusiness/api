import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HistoryTransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD = 'Reward',
}

export enum CompactHistoryStatus {
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
}
