import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { MonitoringModule } from 'src/subdomains/monitoring/monitoring.module';
import { TransactionController } from './api/controllers/transaction.controller';
import { TransactionRepository } from './application/repositories/transaction.repository';
import { TransactionExecutionService } from './application/services/transaction-execution.service';
import { TransactionService } from './application/services/transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionRepository]), SharedModule, BlockchainModule, MonitoringModule],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionExecutionService],
  exports: [TransactionService, TransactionExecutionService],
})
export class TransactionModule {}
