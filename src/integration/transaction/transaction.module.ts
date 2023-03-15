import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { MonitoringModule } from 'src/subdomains/monitoring/monitoring.module';
import { VaultModule } from '../vault/vault.module';
import { TransactionController } from './api/controllers/transaction.controller';
import { TransactionCacheRepository } from './application/repositories/transaction-cache.repository';
import { TransactionRepository } from './application/repositories/transaction.repository';
import { TransactionCacheService } from './application/services/transaction-cache.service';
import { TransactionExecutionService } from './application/services/transaction-execution.service';
import { TransactionService } from './application/services/transaction.service';
import { TransactionCache } from './domain/entities/transaction-cache.entity';
import { Transaction } from './domain/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionCache]),
    SharedModule,
    BlockchainModule,
    MonitoringModule,
    VaultModule,
  ],
  controllers: [TransactionController],
  providers: [
    TransactionCacheRepository,
    TransactionRepository,
    TransactionService,
    TransactionCacheService,
    TransactionExecutionService,
  ],
  exports: [TransactionExecutionService],
})
export class TransactionModule {}
