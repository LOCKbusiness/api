import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class StakingAnalyticsUpdateQuery {
  @IsNotEmpty()
  @IsString()
  asset: string;

  @IsNotEmpty()
  @IsEnum(StakingStrategy)
  strategy: StakingStrategy;
}
