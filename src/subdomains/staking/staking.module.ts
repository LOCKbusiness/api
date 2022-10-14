import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { PayInModule } from '../payin/payin.module';
import { UserModule } from '../user/user.module';
import { DepositController } from './api/controllers/deposit.controller';
import { RewardController } from './api/controllers/reward.controller';
import { StakingController } from './api/controllers/staking.controller';
import { StakingWithdrawalController } from './api/controllers/staking-withdrawal.controller';
import { StakingFactory } from './application/factories/staking.factory';
import { StakingBlockchainAddressRepository } from './application/repositories/staking-blockchain-address.repository';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingBlockchainAddressService } from './application/services/staking-blockchain-address.service';
import { LiquidityManagementService } from './application/services/liquidity-management.service';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingRewardService } from './application/services/staking-reward.service';
import { StakingWithdrawalService } from './application/services/staking-withdrawal.service';
import { StakingService } from './application/services/staking.service';
import { StakingDeFiChainService } from './infrastructure/staking-defichain.service';
import { MasternodeController } from '../../integration/masternode/api/controllers/masternode.controller';
import { MasternodeRepository } from '../../integration/masternode/application/repositories/masternode.repository';
import { StakingAuthorizeService } from './infrastructure/staking-authorize.service';
import { StakingKycCheckService } from './infrastructure/staking-kyc-check.service';
import { IntegrationModule } from 'src/integration/integration.module';
import { WithdrawalService } from './application/services/withdrawal.service';
import { WithdrawalRepository } from './application/repositories/withdrawal.repository';
import { WithdrawalController } from './api/controllers/withdrawal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StakingRepository,
      StakingBlockchainAddressRepository,
      MasternodeRepository,
      WithdrawalRepository,
    ]),
    BlockchainModule,
    SharedModule,
    UserModule,
    PayInModule,
    IntegrationModule,
  ],
  controllers: [
    StakingController,
    DepositController,
    RewardController,
    StakingWithdrawalController,
    WithdrawalController,
    MasternodeController,
  ],
  providers: [
    StakingService,
    StakingDepositService,
    StakingDeFiChainService,
    StakingRewardService,
    StakingWithdrawalService,
    StakingFactory,
    StakingBlockchainAddressService,
    StakingAuthorizeService,
    StakingKycCheckService,
    LiquidityManagementService,
    WithdrawalService,
  ],
  exports: [StakingService],
})
export class StakingModule {}
