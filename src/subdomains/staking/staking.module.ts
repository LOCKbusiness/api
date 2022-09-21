import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { PayInModule } from '../payin/payin.module';
import { UserModule } from '../user/user.module';
import { DepositController } from './api/controllers/deposit.controller';
import { RewardController } from './api/controllers/reward.controller';
import { StakingController } from './api/controllers/staking.controller';
import { WithdrawalController } from './api/controllers/withdrawal.controller';
import { StakingFactory } from './application/factories/staking.factory';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingRewardService } from './application/services/staking-reward.service';
import { StakingWithdrawalService } from './application/services/staking-withdrawal.service';
import { StakingService } from './application/services/staking.service';
import { StakingDeFiChainService } from './infrastructre/staking-defichain.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingRepository]), AinModule, SharedModule, UserModule, PayInModule],
  controllers: [StakingController, DepositController, RewardController, WithdrawalController],
  providers: [
    StakingService,
    StakingDepositService,
    StakingDeFiChainService,
    StakingRewardService,
    StakingWithdrawalService,
    StakingFactory,
  ],
  exports: [],
})
export class StakingModule {}
