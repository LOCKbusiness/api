import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { PrepareStrategy } from './impl/base/prepare.strategy';
import { DeFiChainStrategy } from './impl/defichain.strategy';

enum Alias {
  DEFICHAIN = 'DeFiChain',
}

export { Alias as PrepareStrategyAlias };

@Injectable()
export class PrepareStrategiesFacade {
  protected readonly strategies: Map<Alias, PrepareStrategy> = new Map();

  constructor(deFiChainStrategy: DeFiChainStrategy) {
    this.strategies.set(Alias.DEFICHAIN, deFiChainStrategy);
  }

  getPrepareStrategy(criteria: Asset | Alias): PrepareStrategy {
    return criteria instanceof Asset ? this.getByAsset(criteria) : this.getByAlias(criteria);
  }

  getPrepareStrategyAlias(asset: Asset): Alias {
    const { blockchain } = asset;

    if (blockchain === Blockchain.DEFICHAIN) return Alias.DEFICHAIN;
  }

  //*** HELPER METHODS ***//

  private getByAlias(alias: Alias): PrepareStrategy {
    const strategy = this.strategies.get(alias);

    if (!strategy) throw new Error(`No PrepareStrategy found. Alias: ${alias}`);

    return strategy;
  }

  private getByAsset(asset: Asset): PrepareStrategy {
    const alias = this.getPrepareStrategyAlias(asset);

    return this.getByAlias(alias);
  }
}
