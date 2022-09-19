import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingService } from './application/services/staking.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingRepository]), AinModule, SharedModule],
  controllers: [],
  providers: [StakingService],
  exports: [],
})
export class StakingModule {}
