import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { StakingAnalyticsOutputDto } from '../../application/dto/output/staking-analytics.output.dto';
import { StakingAnalyticsService } from '../../application/services/staking-analytics.service';

@ApiTags('analytics')
@Controller('analytics/staking')
export class StakingAnalyticsController {
  constructor(private readonly stakingAnalyticsService: StakingAnalyticsService) {}

  @Get()
  @ApiResponse({ status: 200, type: StakingAnalyticsOutputDto })
  async getStakingAnalytics(): Promise<StakingAnalyticsOutputDto> {
    return this.stakingAnalyticsService.getStakingAnalyticsCache();
  }
}
