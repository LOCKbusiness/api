import { Module } from '@nestjs/common';
import { MasternodeModule } from './masternode/masternode.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [MasternodeModule, TransactionModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class IntegrationModule {}
