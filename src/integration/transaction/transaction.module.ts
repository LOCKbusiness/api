import { Module } from '@nestjs/common';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { TransactionController } from './api/controllers/transaction.controller';
import { TransactionExecutionService } from './application/services/transaction-execution.service';
import { TransactionService } from './application/services/transaction.service';

@Module({
  imports: [SharedModule, AinModule, BlockchainModule],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionExecutionService],
  exports: [TransactionService, TransactionExecutionService],
})
export class TransactionModule {}
