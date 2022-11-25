import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { LiquidityOrderFactory } from './factories/liquidity-order.factory';
import { LiquidityOrderRepository } from './repositories/liquidity-order.repository';
import { DexService } from './services/dex.service';
import { DexDeFiChainService } from './services/dex-defichain.service';
import { CheckLiquidityStrategies } from './strategies/check-liquidity/check-liquidity.facade';
import { PurchaseLiquidityStrategies } from './strategies/purchase-liquidity/purchase-liquidity.facade';
import { DeFiChainDefaultStrategy as DeFiChainDefaultStrategyCL } from './strategies/check-liquidity/impl/defichain-default.strategy';
import { DeFiChainPoolPairStrategy as DeFiChainPoolPairStrategyCL } from './strategies/check-liquidity/impl/defichain-poolpair.strategy';
import { DeFiChainDfiStrategy as DeFiChainDfiStrategyPL } from './strategies/purchase-liquidity/impl/defichain-dfi.strategy';
import { DeFiChainCryptoStrategy as DeFiChainCryptoStrategyPL } from './strategies/purchase-liquidity/impl/defichain-crypto.strategy';
import { DeFiChainPoolPairStrategy as DeFiChainPoolPairStrategyPL } from './strategies/purchase-liquidity/impl/defichain-poolpair.strategy';
import { DeFiChainStockStrategy as DeFiChainStockStrategyPL } from './strategies/purchase-liquidity/impl/defichain-stock.strategy';
import { DeFiChainCoinStrategy as DeFiChainCoinStrategySL } from './strategies/sell-liquidity/impl/defichain-coin.strategy';
import { DeFiChainTokenStrategy as DeFiChainTokenStrategySL } from './strategies/sell-liquidity/impl/defichain-token.strategy';
import { DexController } from './dex.controller';
import { SellLiquidityStrategies } from './strategies/sell-liquidity/sell-liquidity.facade';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { NotificationModule } from 'src/integration/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([LiquidityOrderRepository]), BlockchainModule, NotificationModule, SharedModule],
  controllers: [DexController],
  providers: [
    DexService,
    LiquidityOrderFactory,
    DexDeFiChainService,
    CheckLiquidityStrategies,
    PurchaseLiquidityStrategies,
    SellLiquidityStrategies,
    DeFiChainDefaultStrategyCL,
    DeFiChainPoolPairStrategyCL,
    DeFiChainDfiStrategyPL,
    DeFiChainCryptoStrategyPL,
    DeFiChainPoolPairStrategyPL,
    DeFiChainStockStrategyPL,
    DeFiChainCoinStrategySL,
    DeFiChainTokenStrategySL,
  ],
  exports: [DexService],
})
export class DexModule {}
