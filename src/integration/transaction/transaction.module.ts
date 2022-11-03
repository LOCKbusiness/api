import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { YieldMachineModule } from 'src/subdomains/yield-machine/yield-machine.module';
import { TransactionController } from './api/controllers/transaction.controller';
import { TransactionRepository } from './application/repositories/transaction.repository';
import { TransactionCreationService } from './application/services/transaction-creation.service';
import { TransactionExecutionService } from './application/services/transaction-execution.service';
import { TransactionService } from './application/services/transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionRepository]), SharedModule, BlockchainModule, YieldMachineModule],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionExecutionService, TransactionCreationService],
  exports: [TransactionService, TransactionExecutionService, TransactionCreationService],
})
export class TransactionModule {}
