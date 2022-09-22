import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AinModule } from './blockchain/ain/ain.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { AnalyticsModule } from './subdomains/analytics/analytics.module';
import { StakingModule } from './subdomains/staking/staking.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(GetConfig().database),
    SharedModule,
    AinModule,
    UserModule,
    StakingModule,
    AnalyticsModule,
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
