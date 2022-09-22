import { Module } from '@nestjs/common';
import { StakingModule } from '../staking/staking.module';
import { StakingAnalyticsController } from './api/controllers/staking-analytics.controller';
import { StakingAnalyticsService } from './application/services/staking-analytics.service';

@Module({
  imports: [StakingModule],
  controllers: [StakingAnalyticsController],
  providers: [StakingAnalyticsService],
  exports: [],
})
export class AnalyticsModule {}
