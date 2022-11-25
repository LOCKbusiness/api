import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { SellLiquidityStrategy } from './impl/base/sell-liquidity.strategy';
import { DeFiChainCoinStrategy } from './impl/defichain-coin.strategy';
import { DeFiChainTokenStrategy } from './impl/defichain-token.strategy';

enum Alias {
  DEFICHAIN_COIN = 'DeFiChainCoin',
  DEFICHAIN_TOKEN = 'DeFiChainToken',
}

export { Alias as SellLiquidityStrategyAlias };

@Injectable()
export class SellLiquidityStrategies {
  protected readonly strategies = new Map<Alias, SellLiquidityStrategy>();

  constructor(deFiChainCoin: DeFiChainCoinStrategy, deFiChainToken: DeFiChainTokenStrategy) {
    this.strategies.set(Alias.DEFICHAIN_COIN, deFiChainCoin);
    this.strategies.set(Alias.DEFICHAIN_TOKEN, deFiChainToken);
  }

  getSellLiquidityStrategy(criteria: Asset | Alias): SellLiquidityStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  //*** HELPER METHODS ***//

  private getByAlias(alias: Alias): SellLiquidityStrategy {
    const strategy = this.strategies.get(alias);

    if (!strategy) throw new Error(`No SellLiquidityStrategy found. Alias: ${alias}`);

    return strategy;
  }

  private getByAsset(asset: Asset): SellLiquidityStrategy {
    const alias = this.getAlias(asset);

    return this.getByAlias(alias);
  }

  private getAlias(asset: Asset): Alias {
    const { blockchain, type: assetType } = asset;

    if (blockchain === Blockchain.DEFICHAIN) {
      return assetType === AssetType.COIN ? Alias.DEFICHAIN_COIN : Alias.DEFICHAIN_TOKEN;
    }
  }
}
