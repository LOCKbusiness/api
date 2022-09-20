import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AinModule } from './blockchain/ain/ain.module';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { StakingModule } from './subdomains/staking/staking.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [TypeOrmModule.forRoot(GetConfig().database), SharedModule, AinModule, UserModule, StakingModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
