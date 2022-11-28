import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
