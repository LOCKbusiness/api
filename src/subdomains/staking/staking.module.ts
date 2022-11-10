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
import { StakingAuthorizeService } from './infrastructure/staking-authorize.service';
import { StakingKycCheckService } from './infrastructure/staking-kyc-check.service';
import { IntegrationModule } from 'src/integration/integration.module';
import { CoinGeckoService } from './infrastructure/coin-gecko.service';
import { FIAT_PRICE_PROVIDER } from './application/interfaces';
import { AssetStakingMetadataRepository } from './application/repositories/asset-staking-metadata.repository';
import { WithdrawalRepository } from './application/repositories/withdrawal.repository';
import { WithdrawalController } from './api/controllers/withdrawal.controller';
import { DepositRepository } from './application/repositories/deposit.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StakingRepository,
      StakingBlockchainAddressRepository,
      WithdrawalRepository,
      DepositRepository,
      AssetStakingMetadataRepository,
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
  ],
  providers: [
    {
      provide: FIAT_PRICE_PROVIDER,
      useClass: CoinGeckoService,
    },
    StakingService,
    StakingDepositService,
    StakingDepositForwardService,
    StakingDeFiChainService,
    StakingRewardService,
    StakingWithdrawalService,
    StakingFactory,
    StakingBlockchainAddressService,
    StakingAuthorizeService,
    StakingKycCheckService,
    LiquidityManagementService,
  ],
  exports: [StakingService, StakingDepositService, StakingWithdrawalService],
})
export class StakingModule {}
