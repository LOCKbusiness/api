import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { StakingModule } from '../staking/staking.module';
import { UserModule } from '../user/user.module';
import { SupportController } from './api/controllers/support.controller';

@Module({
  imports: [TypeOrmModule.forFeature(), UserModule, StakingModule, SharedModule],
  controllers: [SupportController],
  providers: [],
  exports: [],
})
export class SupportModule {}
