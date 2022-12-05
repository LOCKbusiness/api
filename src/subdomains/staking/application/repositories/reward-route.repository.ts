import { EntityRepository, Repository } from 'typeorm';
import { RewardRoute } from '../../domain/entities/reward-route.entity';

@EntityRepository(RewardRoute)
export class RewardRouteRepository extends Repository<RewardRoute> {}
