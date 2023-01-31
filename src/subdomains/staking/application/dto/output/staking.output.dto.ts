import { ApiProperty } from '@nestjs/swagger';
import { StakingStatus, StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { RewardRouteOutputDto } from './reward-route.output.dto';
import { StakingBalanceDto } from './staking-balance.dto';

export class StakingOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: StakingStatus })
  status: StakingStatus;

  @ApiProperty({ enum: StakingStrategy })
  strategy: StakingStrategy;

  @ApiProperty({ deprecated: true })
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

  @ApiProperty({ deprecated: true })
  balance: number;

  @ApiProperty({ deprecated: true })
  pendingDeposits: number;

  @ApiProperty({ deprecated: true })
  pendingWithdrawals: number;

  @ApiProperty({ type: StakingBalanceDto, isArray: true })
  balances: StakingBalanceDto[];

  @ApiProperty({ type: RewardRouteOutputDto, isArray: true })
  rewardRoutes: RewardRouteOutputDto[];
}
