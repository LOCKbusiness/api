import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StakingModule } from '../staking/staking.module';
import { StakingAnalyticsController } from './api/controllers/staking-analytics.controller';
import { StakingAnalyticsRepository } from './application/repositories/staking-analytics.repository';
import { StakingAnalyticsService } from './application/services/staking-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingAnalyticsRepository]), StakingModule],
  controllers: [StakingAnalyticsController],
  providers: [StakingAnalyticsService],
  exports: [],
})
export class AnalyticsModule {}
