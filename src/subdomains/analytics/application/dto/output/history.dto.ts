import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';

export enum HistoryTransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD = 'Reward',
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

  @ApiProperty({ enum: { ...WithdrawalStatus, ...DepositStatus, ...RewardStatus } })
  status: WithdrawalStatus | DepositStatus | RewardStatus;
}
