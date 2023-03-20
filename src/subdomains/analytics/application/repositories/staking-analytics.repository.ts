import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetQuery } from 'src/shared/services/asset.service';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { EntityManager } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@Injectable()
export class StakingAnalyticsRepository extends BaseRepository<StakingAnalytics> {
  constructor(manager: EntityManager) {
    super(StakingAnalytics, manager);
  }

  async getByType({ strategy, asset }: { strategy: StakingStrategy; asset: AssetQuery }): Promise<StakingAnalytics> {
    return this.findOneBy({ strategy, asset: { name: asset.name, type: asset.type, blockchain: asset.blockchain } });
  }

  async getByFilter(strategy?: StakingStrategy, asset?: string, blockchain?: Blockchain): Promise<StakingAnalytics[]> {
    let filter = {};
    let assetFilter = {};

    if (strategy) filter = { ...filter, strategy };
    if (asset) assetFilter = { ...assetFilter, name: asset };
    if (blockchain) assetFilter = { ...assetFilter, blockchain };

    filter = { ...filter, asset: assetFilter };
    return this.find({ where: filter });
  }
}
