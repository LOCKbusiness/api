import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class StakingAnalyticsOutputDto {
  @ApiProperty()
  updated: Date;

  @ApiProperty()
  apy: number;

  @ApiProperty()
  apr: number;

  @ApiPropertyOptional()
  operatorCount: number;

  @ApiProperty()
  tvl: number;

  @ApiProperty()
  tvlUsd: number;

  @ApiProperty()
  asset: string;

  @ApiProperty({ enum: StakingStrategy })
  strategy: StakingStrategy;
}
