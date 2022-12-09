import { ApiProperty } from '@nestjs/swagger';
import { StakingStatus, StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { RewardRouteOutputDto } from './reward-route.output.dto';

export class StakingOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: StakingStatus })
  status: StakingStatus;

  @ApiProperty({ enum: StakingStrategy })
  strategy: StakingStrategy;

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

  @ApiProperty({ type: RewardRouteOutputDto, isArray: true })
  rewardRoutes: RewardRouteOutputDto[];
}
