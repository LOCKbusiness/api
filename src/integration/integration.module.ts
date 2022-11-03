import { Module } from '@nestjs/common';
import { MasternodeModule } from './masternode/masternode.module';
import { NotificationModule } from './notification/notification.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [MasternodeModule, TransactionModule, NotificationModule],
  controllers: [],
  providers: [],
  exports: [MasternodeModule, TransactionModule, NotificationModule],
})
export class IntegrationModule {}
