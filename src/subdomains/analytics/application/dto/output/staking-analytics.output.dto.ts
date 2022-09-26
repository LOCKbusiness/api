import { ApiProperty } from '@nestjs/swagger';

export class StakingAnalyticsOutputDto {
  @ApiProperty()
  apy: number;

  @ApiProperty()
  apr: number;

  //*** FACTORY METHODS ***//

  static create(apr: number, apy: number): StakingAnalyticsOutputDto {
    const stakingAnalytics = new StakingAnalyticsOutputDto();

    stakingAnalytics.apr = apr;
    stakingAnalytics.apy = apy;

    return stakingAnalytics;
  }
}
