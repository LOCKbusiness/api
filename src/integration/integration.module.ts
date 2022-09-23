import { Module } from '@nestjs/common';
import { MasternodeModule } from './masternode/masternode.module';

@Module({
  imports: [MasternodeModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class IntegrationModule {}
