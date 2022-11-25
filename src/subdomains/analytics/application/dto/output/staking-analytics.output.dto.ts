import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class StakingAnalyticsOutputDto {
  @ApiProperty()
  updated: Date;

  @ApiProperty()
  apy: number;

  @ApiProperty()
  apr: number;

  @ApiProperty()
  @IsOptional()
  masternodeCount: number;

  @ApiProperty()
  tvl: number;
}
