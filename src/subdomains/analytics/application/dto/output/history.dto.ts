import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CompactHistoryTransactionType {
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

export enum CompactHistoryType {
  MASTERNODE = 'Masternode',
  LIQUIDITY_MINING = 'LiquidityMining',
  WALLET = 'Wallet',
  EXTERNAL = 'External',
}

export class CompactHistoryDto {
  @ApiPropertyOptional()
  inputAmount?: number;

  @ApiPropertyOptional()
  inputAsset?: string;

  @ApiPropertyOptional()
  outputAmount?: number;

  @ApiPropertyOptional()
  outputAsset?: string;

  @ApiPropertyOptional()
  feeAmount?: number;

  @ApiPropertyOptional()
  feeAsset?: string;

  @ApiPropertyOptional()
  amountInEur?: number;

  @ApiPropertyOptional()
  amountInChf?: number;

  @ApiPropertyOptional()
  amountInUsd?: number;

  @ApiPropertyOptional()
  txId?: string;

  @ApiProperty()
  date: Date;

  @ApiProperty({ enum: CompactHistoryTransactionType })
  type: CompactHistoryTransactionType;

  @ApiProperty({ enum: CompactHistoryStatus })
  status: CompactHistoryStatus;

  @ApiPropertyOptional({ enum: CompactHistoryType })
  source?: CompactHistoryType;

  @ApiProperty({ enum: CompactHistoryType })
  target: CompactHistoryType;

  @ApiProperty()
  targetAddress: string;
}
