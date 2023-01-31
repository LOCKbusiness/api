import { Injectable } from '@nestjs/common';
import { AssetQuery } from 'src/shared/models/asset/asset.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { EntityManager, Repository } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@Injectable()
export class StakingAnalyticsRepository extends Repository<StakingAnalytics> {
  constructor(manager: EntityManager) {
    super(StakingAnalytics, manager);
  }

  async getByType({ strategy, asset }: { strategy: StakingStrategy; asset: AssetQuery }): Promise<StakingAnalytics> {
    return this.findOneBy({ strategy, asset: { name: asset.name, type: asset.type, blockchain: asset.blockchain } });
  }
}
