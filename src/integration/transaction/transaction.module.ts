import { Module } from '@nestjs/common';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { TransactionController } from './api/controllers/transaction.controller';
import { TransactionService } from './application/services/transaction.service';

@Module({
  imports: [SharedModule, AinModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [],
})
export class TransactionModule {}
