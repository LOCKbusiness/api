import { ApiProperty } from '@nestjs/swagger';

export class StakingAnalyticsOutputDto {
  @ApiProperty()
  updated: Date;

  @ApiProperty()
  apy: number;

  @ApiProperty()
  apr: number;
}
