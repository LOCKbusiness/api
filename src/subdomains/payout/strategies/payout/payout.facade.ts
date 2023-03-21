import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset } from 'src/shared/entities/asset.entity';
import { PayoutStrategy } from './impl/base/payout.strategy';
import { DeFiChainDfiStrategy } from './impl/defichain-dfi.strategy';
import { DeFiChainDefaultStrategy } from './impl/defichain-default.strategy';

enum Alias {
  DEFICHAIN_DFI = 'DeFiChainDfi',
  DEFICHAIN_DEFAULT = 'DeFiChainDefault',
}

export { Alias as PayoutStrategyAlias };

@Injectable()
export class PayoutStrategiesFacade {
  protected readonly strategies: Map<Alias, PayoutStrategy> = new Map();

  constructor(deFiChainDfi: DeFiChainDfiStrategy, deFiChainDefault: DeFiChainDefaultStrategy) {
    this.strategies.set(Alias.DEFICHAIN_DFI, deFiChainDfi);
    this.strategies.set(Alias.DEFICHAIN_DEFAULT, deFiChainDefault);
  }

  getPayoutStrategy(criteria: Asset | Alias): PayoutStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  getPayoutStrategyAlias(asset: Asset): Alias {
    const { blockchain, name: assetName } = asset;

    if (blockchain === Blockchain.DEFICHAIN) {
      return assetName === 'DFI' ? Alias.DEFICHAIN_DFI : Alias.DEFICHAIN_DEFAULT;
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
