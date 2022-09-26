import { Injectable } from '@nestjs/common';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingAnalytics } from '../../domain/staking-analytics';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';

@Injectable()
export class StakingAnalyticsService {
  constructor(private readonly stakingService: StakingService) {}

  async getStakingAnalytics(): Promise<StakingAnalyticsOutputDto> {
    const { dateFrom, dateTo } = StakingAnalytics.getAPRPeriod();

    const averageBalance = await this.stakingService.getAverageStakingBalance(dateFrom, dateTo);
    const totalRewards = await this.stakingService.getTotalRewards(dateFrom, dateTo);

    const apr = StakingAnalytics.calculateAPR(averageBalance, totalRewards);
    const apy = StakingAnalytics.calculateAPY(apr);

    return StakingAnalyticsOutputDto.create(apr, apy);
  }
}
