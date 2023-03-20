import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Asset, AssetCategory } from 'src/shared/entities/asset.entity';
import { DeFiChainCryptoStrategy } from './impl/defichain-crypto.strategy';
import { PurchaseLiquidityStrategy } from './impl/base/purchase-liquidity.strategy';
import { DeFiChainPoolPairStrategy } from './impl/defichain-poolpair.strategy';
import { DeFiChainStockStrategy } from './impl/defichain-stock.strategy';
import { DeFiChainDfiStrategy } from './impl/defichain-dfi.strategy';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

enum Alias {
  DEFICHAIN_POOL_PAIR = 'DeFiChainPoolPair',
  DEFICHAIN_STOCK = 'DeFiChainStock',
  DEFICHAIN_CRYPTO = 'DeFiChainCrypto',
  DEFICHAIN_DFI = 'DeFiChainDfi',
}

export { Alias as PurchaseLiquidityStrategyAlias };

@Injectable()
export class PurchaseLiquidityStrategies {
  protected readonly strategies = new Map<Alias, PurchaseLiquidityStrategy>();

  constructor(
    deFiChainDfi: DeFiChainDfiStrategy,
    deFiChainCrypto: DeFiChainCryptoStrategy,
    @Inject(forwardRef(() => DeFiChainPoolPairStrategy))
    deFiChainPoolPair: DeFiChainPoolPairStrategy,
    deFiChainStock: DeFiChainStockStrategy,
  ) {
    this.strategies.set(Alias.DEFICHAIN_DFI, deFiChainDfi);
    this.strategies.set(Alias.DEFICHAIN_CRYPTO, deFiChainCrypto);
    this.strategies.set(Alias.DEFICHAIN_POOL_PAIR, deFiChainPoolPair);
    this.strategies.set(Alias.DEFICHAIN_STOCK, deFiChainStock);
  }

  getPurchaseLiquidityStrategy(criteria: Asset | Alias): PurchaseLiquidityStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  //*** HELPER METHODS ***//

  private getByAlias(alias: Alias): PurchaseLiquidityStrategy {
    const strategy = this.strategies.get(alias);

    if (!strategy) throw new Error(`No PurchaseLiquidityStrategy found. Alias: ${alias}`);

    return strategy;
  }

  private getByAsset(asset: Asset): PurchaseLiquidityStrategy {
    const alias = this.getAlias(asset);

    return this.getByAlias(alias);
  }

  private getAlias(asset: Asset): Alias {
    const { name, blockchain, category: assetCategory } = asset;

    if (blockchain === Blockchain.DEFICHAIN) {
      if (assetCategory === AssetCategory.CRYPTO && name === 'DFI') return Alias.DEFICHAIN_DFI;
      if (assetCategory === AssetCategory.CRYPTO) return Alias.DEFICHAIN_CRYPTO;
      if (assetCategory === AssetCategory.POOL_PAIR) return Alias.DEFICHAIN_POOL_PAIR;
      if (assetCategory === AssetCategory.STOCK) return Alias.DEFICHAIN_STOCK;
    }
  }
}
