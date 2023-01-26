import { Injectable } from '@nestjs/common';
import { StakingType } from 'src/subdomains/staking/domain/entities/staking.entity';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@Injectable()
export class StakingAnalyticsRepository extends Repository<StakingAnalytics> {
  constructor(manager: EntityManager) {
    super(StakingAnalytics, manager);
  }

  async getByType(type: FindOptionsWhere<StakingType>): Promise<StakingAnalytics> {
    return this.findOneBy(type);
  }
}
