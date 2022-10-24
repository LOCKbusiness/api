import { ApiProperty } from '@nestjs/swagger';
import { StakingStatus } from 'src/subdomains/staking/domain/enums';

export class StakingOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: StakingStatus })
  status: StakingStatus;

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
