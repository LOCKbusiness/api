import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { MasternodeModule } from './masternode/masternode.module';
import { NotificationModule } from './notification/notification.module';
import { TransactionModule } from './transaction/transaction.module';
import { VaultModule } from './vault/vault.module';

@Module({
  imports: [MasternodeModule, VaultModule, TransactionModule, NotificationModule, InfrastructureModule],
  controllers: [],
  providers: [],
  exports: [MasternodeModule, VaultModule, TransactionModule, NotificationModule, InfrastructureModule],
})
export class IntegrationModule {}
