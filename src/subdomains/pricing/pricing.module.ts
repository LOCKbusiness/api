import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { AssetStakingMetadata } from '../pricing/domain/entities/asset-staking-metadata.entity';
import { AssetStakingMetadataRepository } from './application/repositories/asset-staking-metadata.repository';
import { CoinGeckoService } from './application/services/coin-gecko.service';
import { PriceProviderService } from './application/services/price-provider.service';
import { PricingDeFiChainService } from './application/services/pricing-defichain.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetStakingMetadata]), BlockchainModule, SharedModule],
  providers: [AssetStakingMetadataRepository, CoinGeckoService, PriceProviderService, PricingDeFiChainService],
  exports: [PriceProviderService],
})
export class PricingModule {}
