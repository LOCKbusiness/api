import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChainReportTransactionType {
  TRADE = 'Trade',
  WITHDRAWAL = 'Withdrawal',
  DEPOSIT = 'Deposit',
  STAKING = 'Staking',
  LM = 'Lm',
  FEE = 'Fee',
}

export class ChainReportCsvHistoryDto {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ enum: ChainReportTransactionType })
  transactionType: ChainReportTransactionType;

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

  @ApiProperty()
  txId: string;

  @ApiPropertyOptional()
  description: string;
}
