import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { DepositController } from './api/controllers/deposit.controller';
import { StakingController } from './api/controllers/staking.controller';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingService } from './application/services/staking.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingRepository]), AinModule, SharedModule],
  controllers: [StakingController, DepositController],
  providers: [StakingService, StakingDepositService],
  exports: [],
})
export class StakingModule {}
