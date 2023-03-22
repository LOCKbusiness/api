import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { MonitoringController } from './api/monitoring.controller';
import { MonitoringService } from './application/services/monitoring.service';
import { NodeBalanceObserver } from './observers/node-balance.observer';
import { NodeHealthObserver } from './observers/node-health.observer';
import { StakingCombinedObserver } from './observers/staking-combined.observer';
import { SystemStateSnapshotRepository } from './application/repositories/system-state-snapshot.repository';
import { NotificationModule } from 'src/integration/notification/notification.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { StakingExternalObserver } from './observers/staking-external.observer';
import { InfrastructureModule } from 'src/integration/infrastructure/infrastructure.module';
import { SystemStateSnapshot } from './domain/entities/system-state-snapshot.entity';
import { VaultModule } from 'src/integration/vault/vault.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemStateSnapshot]),
    SharedModule,
    BlockchainModule,
    NotificationModule,
    InfrastructureModule,
    VaultModule,
  ],
  providers: [
    SystemStateSnapshotRepository,
    MonitoringService,
    NodeBalanceObserver,
    NodeHealthObserver,
    StakingCombinedObserver,
    StakingExternalObserver,
  ],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}
