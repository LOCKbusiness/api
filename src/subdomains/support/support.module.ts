import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { StakingModule } from '../staking/staking.module';
import { UserModule } from '../user/user.module';
import { SupportController } from './api/controllers/support.controller';
import { SupportService } from './application/services/support.service';

@Module({
  imports: [TypeOrmModule.forFeature(), UserModule, StakingModule, SharedModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [],
})
export class SupportModule {}
