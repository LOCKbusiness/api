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
  stakingFee: number;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  pendingDeposits: number;

  @ApiProperty()
  pendingWithdrawals: number;
}
