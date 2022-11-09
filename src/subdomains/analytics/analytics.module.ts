import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StakingModule } from '../staking/staking.module';
import { HistoryController } from './api/controllers/history.controller';
import { StakingAnalyticsController } from './api/controllers/staking-analytics.controller';
import { StakingAnalyticsRepository } from './application/repositories/staking-analytics.repository';
import { StakingHistoryService } from './application/services/staking-history.service';
import { StakingAnalyticsService } from './application/services/staking-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingAnalyticsRepository]), StakingModule],
  controllers: [StakingAnalyticsController, HistoryController],
  providers: [StakingAnalyticsService, StakingHistoryService],
  exports: [],
})
export class AnalyticsModule {}
