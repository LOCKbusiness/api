import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainModule } from './blockchain/blockchain.module';
import { GetConfig } from './config/config';
import { IntegrationModule } from './integration/integration.module';
import { SharedModule } from './shared/shared.module';
import { AddressPoolModule } from './subdomains/address-pool/address-pool.module';
import { AnalyticsModule } from './subdomains/analytics/analytics.module';
import { MonitoringModule } from './subdomains/monitoring/monitoring.module';
import { StakingModule } from './subdomains/staking/staking.module';
import { SupportModule } from './subdomains/support/support.module';
import { UserModule } from './subdomains/user/user.module';
import { VotingModule } from './subdomains/voting/voting.module';
import { YieldMachineModule } from './subdomains/yield-machine/yield-machine.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(GetConfig().database),
    SharedModule,
    UserModule,
    AddressPoolModule,
    StakingModule,
    YieldMachineModule,
    AnalyticsModule,
    BlockchainModule,
    IntegrationModule,
    MonitoringModule,
    SupportModule,
    VotingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
