import { BadRequestException } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetQuery } from 'src/shared/models/asset/asset.service';
import { StakingTypes } from '../../domain/entities/staking.entity';
import { StakingStrategy } from '../../domain/enums';

export class StakingStrategyValidator {
  static validate(strategy: StakingStrategy, asset: string, blockchain: Blockchain): AssetQuery {
    const assetSpec = StakingTypes[strategy]?.find((a) => a.name === asset && a.blockchain === blockchain);
    if (!assetSpec) throw new BadRequestException(`Strategy ${strategy} with ${asset} is not allowed on ${blockchain}`);

    return assetSpec;
  }
}
