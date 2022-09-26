import { EntityRepository, Repository } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@EntityRepository(StakingAnalytics)
export class StakingAnalyticsRepository extends Repository<StakingAnalytics> {}
