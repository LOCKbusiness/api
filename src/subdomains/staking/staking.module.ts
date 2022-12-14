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
import { StakingRepository } from './application/repositories/staking.repository';
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
import { PRICE_PROVIDER } from './application/interfaces';
import { AssetStakingMetadataRepository } from './application/repositories/asset-staking-metadata.repository';
import { WithdrawalRepository } from './application/repositories/withdrawal.repository';
import { WithdrawalController } from './api/controllers/withdrawal.controller';
import { DepositRepository } from './application/repositories/deposit.repository';
import { StakingRewardBatchService } from './application/services/staking-reward-batch.service';
import { StakingRewardDexService } from './application/services/staking-reward-dex.service';
import { StakingRewardOutService } from './application/services/staking-reward-out.service';
import { RewardBatchRepository } from './application/repositories/reward-batch.repository';
import { RewardRepository } from './application/repositories/reward.repository';
import { StakingRewardNotificationService } from './application/services/staking-reward-notification.service';
import { StakingFiatReferenceService } from './application/services/staking-fiat-reference.service';
import { DexModule } from '../dex/dex.module';
import { PayoutModule } from '../payout/payout.module';
import { RewardRouteRepository } from './application/repositories/reward-route.repository';
import { AddressPoolModule } from '../address-pool/address-pool.module';
import { RewardRouteController } from './api/controllers/reward-route.controller';
import { UtxoManagementService } from './application/services/utxo-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StakingRepository,
      WithdrawalRepository,
      DepositRepository,
      RewardRepository,
      RewardBatchRepository,
      RewardRouteRepository,
      AssetStakingMetadataRepository,
    ]),
    BlockchainModule,
    SharedModule,
    UserModule,
    PayInModule,
    DexModule,
    PayoutModule,
    IntegrationModule,
    AddressPoolModule,
  ],
  controllers: [
    StakingController,
    DepositController,
    RewardController,
    RewardRouteController,
    StakingWithdrawalController,
    WithdrawalController,
  ],
  providers: [
    {
      provide: PRICE_PROVIDER,
      useClass: CoinGeckoService,
    },
    StakingService,
    StakingFiatReferenceService,
    StakingDepositService,
    StakingDeFiChainService,
    StakingRewardService,
    StakingRewardBatchService,
    StakingRewardDexService,
    StakingRewardOutService,
    StakingRewardNotificationService,
    StakingWithdrawalService,
    StakingFactory,
    StakingAuthorizeService,
    StakingKycCheckService,
    LiquidityManagementService,
    UtxoManagementService,
  ],
  exports: [
    StakingService,
    StakingDepositService,
    StakingWithdrawalService,
    { provide: PRICE_PROVIDER, useClass: CoinGeckoService },
  ],
})
export class StakingModule {}
