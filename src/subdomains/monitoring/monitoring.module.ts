import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { MonitoringController } from './api/monitoring.controller';
import { MonitoringService } from './application/services/monitoring.service';
import { NodeBalanceObserver } from './observers/node-balance.observer';
import { NodeHealthObserver } from './observers/node-health.observer';
import { StakingBalanceObserver } from './observers/staking-balance.observer';
import { SystemStateSnapshotRepository } from './application/repositories/system-state-snapshot.repository';
import { NotificationModule } from 'src/integration/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([SystemStateSnapshotRepository]), SharedModule, AinModule, NotificationModule],
  providers: [MonitoringService, NodeBalanceObserver, NodeHealthObserver, StakingBalanceObserver],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}
