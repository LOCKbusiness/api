import { StakingType } from 'src/subdomains/staking/domain/entities/staking.entity';
import { EntityRepository, FindOptionsWhere, Repository } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@EntityRepository(StakingAnalytics)
export class StakingAnalyticsRepository extends Repository<StakingAnalytics> {
  async getByType(type: FindOptionsWhere<StakingType>): Promise<StakingAnalytics> {
    return this.findOneBy(type);
  }
}
