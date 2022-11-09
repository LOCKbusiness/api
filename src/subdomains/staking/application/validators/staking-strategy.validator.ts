import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { StakingStrategy } from '../../domain/enums';

@Injectable()
export class StakingStrategyValidator {
  private readonly masternodeAssets = ['DFI'];
  private readonly liquidityMiningAssets = ['DUSD'];

  isAllowed(strategy: StakingStrategy, asset: Asset): boolean {
    switch (strategy) {
      case StakingStrategy.MASTERNODE:
        return this.masternodeAssets.includes(asset.name);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.liquidityMiningAssets.includes(asset.name);
    }
  }
}
