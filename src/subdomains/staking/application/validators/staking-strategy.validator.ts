import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetType } from 'src/shared/models/asset/asset.entity';
import { AssetQuery } from 'src/shared/models/asset/asset.service';
import { StakingStrategy } from '../../domain/enums';

export class StakingStrategyValidator {
  private static readonly stakingAssets = {
    [StakingStrategy.MASTERNODE]: [{ name: 'DFI', blockchain: Blockchain.DEFICHAIN, type: AssetType.COIN }],
    [StakingStrategy.LIQUIDITY_MINING]: [{ name: 'DUSD', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN }],
  };

  static validate(strategy: StakingStrategy, asset: string, blockchain: Blockchain): AssetQuery | undefined {
    return this.stakingAssets[strategy]?.find((a) => a.name === asset && a.blockchain === blockchain);
  }
}
