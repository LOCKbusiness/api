import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { PayoutStrategy } from './impl/base/payout.strategy';
import { DeFiChainCoinStrategy } from './impl/defichain-coin.strategy';
import { DeFiChainTokenStrategy } from './impl/defichain-token.strategy';

enum Alias {
  DEFICHAIN_COIN = 'DeFiChainCoin',
  DEFICHAIN_TOKEN = 'DeFiChainToken',
}

export { Alias as PayoutStrategyAlias };

@Injectable()
export class PayoutStrategiesFacade {
  protected readonly strategies: Map<Alias, PayoutStrategy> = new Map();

  constructor(deFiChainCoin: DeFiChainCoinStrategy, deFiChainToken: DeFiChainTokenStrategy) {
    this.strategies.set(Alias.DEFICHAIN_COIN, deFiChainCoin);
    this.strategies.set(Alias.DEFICHAIN_TOKEN, deFiChainToken);
  }

  getPayoutStrategy(criteria: Asset | Alias): PayoutStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  getPayoutStrategyAlias(asset: Asset): Alias {
    const { blockchain, type: assetType } = asset;

    if (blockchain === Blockchain.DEFICHAIN) {
      return assetType === AssetType.COIN ? Alias.DEFICHAIN_COIN : Alias.DEFICHAIN_TOKEN;
    }
  }

  //*** HELPER METHODS ***//

  private getByAlias(alias: Alias): PayoutStrategy {
    const strategy = this.strategies.get(alias);

    if (!strategy) throw new Error(`No PayoutStrategy found. Alias: ${alias}`);

    return strategy;
  }

  private getByAsset(asset: Asset): PayoutStrategy {
    const alias = this.getPayoutStrategyAlias(asset);

    return this.getByAlias(alias);
  }
}
