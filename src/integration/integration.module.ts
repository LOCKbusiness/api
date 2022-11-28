import { Module } from '@nestjs/common';
import { MasternodeModule } from './masternode/masternode.module';
import { NotificationModule } from './notification/notification.module';
import { TransactionModule } from './transaction/transaction.module';
import { VaultModule } from './vault/vault.module';

@Module({
  imports: [MasternodeModule, VaultModule, TransactionModule, NotificationModule],
  controllers: [],
  providers: [],
  exports: [MasternodeModule, VaultModule, TransactionModule, NotificationModule],
})
export class IntegrationModule {}
