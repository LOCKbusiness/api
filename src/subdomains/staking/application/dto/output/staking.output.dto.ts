import { ApiProperty } from '@nestjs/swagger';
import { StakingBalance } from 'src/subdomains/staking/domain/entities/staking-balances.entity';
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
  minimalDeposits: {
    DFI: number;
    DUSD: number;
  };

  @ApiProperty()
  fee: number;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  balances: StakingBalance[];

  @ApiProperty()
  pendingDeposits: number;

  @ApiProperty()
  pendingWithdrawals: number;

  @ApiProperty({ type: RewardRouteOutputDto, isArray: true })
  rewardRoutes: RewardRouteOutputDto[];

  @ApiProperty()
  rewardsAmount: number;
}
