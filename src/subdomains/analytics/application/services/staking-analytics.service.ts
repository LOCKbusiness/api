import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';
import { StakingAnalyticsOutputDtoMapper } from '../mappers/staking-analytics-output-dto.mapper';
import { StakingAnalyticsRepository } from '../repositories/staking-analytics.repository';

@Injectable()
export class StakingAnalyticsService {
  constructor(
    private readonly repository: StakingAnalyticsRepository,
    private readonly stakingService: StakingService,
  ) {}

  //*** PUBLIC API ***//

  async getStakingAnalyticsCache(): Promise<StakingAnalyticsOutputDto> {
    const analytics = await this.repository.findOne();

    if (!analytics) throw new NotFoundException();

    return StakingAnalyticsOutputDtoMapper.entityToDto(analytics);
  }

  //*** JOBS ***//
  onModuleInit() {
    this.updateStakingAnalytics();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStakingAnalytics(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const { dateFrom, dateTo } = StakingAnalytics.getAprPeriod();

      const averageBalance = await this.stakingService.getAverageStakingBalance(dateFrom, dateTo);
      const averageRewards = await this.stakingService.getAverageRewards(dateFrom, dateTo);

      const analytics = (await this.repository.findOne()) ?? this.repository.create();

      analytics.updateAnalytics(averageBalance, averageRewards);

      await this.repository.save(analytics);
    } catch (e) {
      console.error('Exception during staking analytics update:', e);
    }
  }
}
