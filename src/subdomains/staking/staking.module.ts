import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { PayInModule } from '../payin/payin.module';
import { UserModule } from '../user/user.module';
import { DepositController } from './api/controllers/deposit.controller';
import { RewardController } from './api/controllers/reward.controller';
import { StakingController } from './api/controllers/staking.controller';
import { WithdrawalController } from './api/controllers/withdrawal.controller';
import { StakingFactory } from './application/factories/staking.factory';
import { StakingBlockchainAddressRepository } from './application/repositories/staking-blockchain-address.repository';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingBlockchainAddressService } from './application/services/staking-blockchain-address.service';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingRewardService } from './application/services/staking-reward.service';
import { StakingWithdrawalService } from './application/services/staking-withdrawal.service';
import { StakingService } from './application/services/staking.service';
import { StakingDeFiChainService } from './infrastructre/staking-defichain.service';
import { MasternodeController } from '../../integration/masternode/api/controllers/masternode.controller';
import { MasternodeRepository } from '../../integration/masternode/application/repositories/masternode.repository';
import { MasternodeService } from '../../integration/masternode/application/services/masternode.service';
import { StakingAuthorizeService } from './infrastructre/staking-authorize.service';
import { StakingKycCheckService } from './infrastructre/staking-kyc-check.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StakingRepository, StakingBlockchainAddressRepository, MasternodeRepository]),
    BlockchainModule,
    SharedModule,
    UserModule,
    PayInModule,
  ],
  controllers: [StakingController, DepositController, RewardController, WithdrawalController, MasternodeController],
  providers: [
    StakingService,
    StakingDepositService,
    StakingDeFiChainService,
    StakingRewardService,
    StakingWithdrawalService,
    StakingFactory,
    StakingBlockchainAddressService,
    MasternodeService,
    StakingAuthorizeService,
    StakingKycCheckService,
  ],
  exports: [],
})
export class StakingModule {}
