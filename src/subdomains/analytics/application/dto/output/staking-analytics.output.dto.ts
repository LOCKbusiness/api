import { ApiProperty } from '@nestjs/swagger';

export class StakingAnalyticsOutputDto {
  @ApiProperty()
  apy: number;

  @ApiProperty()
  apr: number;
}
