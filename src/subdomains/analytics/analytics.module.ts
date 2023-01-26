import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StakingModule } from '../staking/staking.module';
import { HistoryController } from './api/controllers/history.controller';
import { StakingAnalyticsController } from './api/controllers/staking-analytics.controller';
import { StakingAnalyticsRepository } from './application/repositories/staking-analytics.repository';
import { StakingHistoryService } from './application/services/staking-history.service';
import { StakingAnalyticsService } from './application/services/staking-analytics.service';
import { SharedModule } from 'src/shared/shared.module';
import { IntegrationModule } from 'src/integration/integration.module';
import { UserModule } from '../user/user.module';
import { StakingAnalytics } from './domain/staking-analytics.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StakingAnalytics]), IntegrationModule, StakingModule, SharedModule, UserModule],
  controllers: [StakingAnalyticsController, HistoryController],
  providers: [StakingAnalyticsRepository, StakingAnalyticsService, StakingHistoryService],
  exports: [],
})
export class AnalyticsModule {}
