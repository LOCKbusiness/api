import { Asset } from 'src/shared/models/asset/asset.entity';
import { StakingStrategy } from '../../domain/enums';

export class StakingStrategyValidator {
  private static readonly masternodeAssets = ['DFI'];
  private static readonly liquidityMiningAssets = ['DUSD'];

  static isAllowed(strategy: StakingStrategy, asset: Asset): boolean {
    switch (strategy) {
      case StakingStrategy.MASTERNODE:
        return this.masternodeAssets.includes(asset.name);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.liquidityMiningAssets.includes(asset.name);
    }
  }
}
