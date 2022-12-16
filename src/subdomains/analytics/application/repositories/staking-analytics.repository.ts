import { StakingType } from 'src/subdomains/staking/domain/entities/staking.entity';
import { DeepPartial, EntityRepository, Repository } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@EntityRepository(StakingAnalytics)
export class StakingAnalyticsRepository extends Repository<StakingAnalytics> {
  async getByType(type: DeepPartial<StakingType>): Promise<StakingAnalytics> {
    return this.findOne(type);
  }
}
