import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';

export enum HistoryTransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD = 'Reward',
}

export class HistoryBaseDto {
  @ApiProperty()
  inputAmount: number;

  @ApiProperty()
  inputAsset: string;

  @ApiPropertyOptional()
  outputAmount: number;

  @ApiPropertyOptional()
  outputAsset: string;

  @ApiPropertyOptional()
  txId: string;

  @ApiProperty()
  date: Date;
}

export class CompactHistoryDto extends HistoryBaseDto {
  @ApiProperty({ enum: HistoryTransactionType })
  type: HistoryTransactionType;

  @ApiProperty()
  status: WithdrawalStatus | DepositStatus | RewardStatus;
}
