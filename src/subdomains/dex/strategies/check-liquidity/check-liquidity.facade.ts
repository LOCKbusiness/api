import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { CheckLiquidityStrategy } from './impl/base/check-liquidity.strategy';
import { DeFiChainDefaultStrategy } from './impl/defichain-default.strategy';
import { DeFiChainPoolPairStrategy } from './impl/defichain-poolpair.strategy';

enum Alias {
  DEFICHAIN_POOL_PAIR = 'DeFiChainPoolPair',
  DEFICHAIN_DEFAULT = 'DeFiChainDefault',
}

export { Alias as CheckLiquidityAlias };

@Injectable()
export class CheckLiquidityStrategies {
  protected readonly strategies = new Map<Alias, CheckLiquidityStrategy>();

  constructor(deFiChainDefault: DeFiChainDefaultStrategy, deFiChainPoolPair: DeFiChainPoolPairStrategy) {
    this.strategies.set(Alias.DEFICHAIN_POOL_PAIR, deFiChainPoolPair);
    this.strategies.set(Alias.DEFICHAIN_DEFAULT, deFiChainDefault);
  }

  getCheckLiquidityStrategy(criteria: Asset | Alias): CheckLiquidityStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  //*** HELPER METHODS ***//

  private getByAlias(alias: Alias): CheckLiquidityStrategy {
    const strategy = this.strategies.get(alias);

    if (!strategy) throw new Error(`No CheckLiquidityStrategy found. Alias: ${alias}`);

    return strategy;
  }

  private getByAsset(asset: Asset): CheckLiquidityStrategy {
    const alias = this.getAlias(asset);

    return this.getByAlias(alias);
  }

  private getAlias(asset: Asset): Alias {
    const { blockchain, category: assetCategory } = asset;

    if (blockchain === Blockchain.DEFICHAIN) {
      if (assetCategory === AssetCategory.POOL_PAIR) return Alias.DEFICHAIN_POOL_PAIR;
      return Alias.DEFICHAIN_DEFAULT;
    }
  }
}
