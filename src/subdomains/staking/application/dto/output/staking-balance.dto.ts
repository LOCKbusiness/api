import { ApiProperty } from '@nestjs/swagger';

export class StakingBalanceDto {
  @ApiProperty()
  asset: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  pendingDeposits: number;

  @ApiProperty()
  pendingWithdrawals: number;
}
