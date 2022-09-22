import { Injectable } from '@nestjs/common';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';

@Injectable()
export class StakingAnalyticsService {
  getStakingAnalytics() {
    // Temporary API placeholder, until functionality is implemented
    const stakingAnalytics = new StakingAnalyticsOutputDto();

    stakingAnalytics.apr = 0.4;
    stakingAnalytics.apy = 0.45;

    return stakingAnalytics;
  }
}
