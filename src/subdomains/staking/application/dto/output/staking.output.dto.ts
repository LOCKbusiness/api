import { ApiProperty } from '@nestjs/swagger';

export class StakingOutputDto {
  @ApiProperty()
  asset: string;

  @ApiProperty()
  depositAddress: string;

  @ApiProperty()
  minimalStake: number;

  @ApiProperty()
  minimalDeposit: number;

  @ApiProperty()
  fee: number;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  pendingDeposits: number;

  @ApiProperty()
  pendingWithdrawals: number;
}
