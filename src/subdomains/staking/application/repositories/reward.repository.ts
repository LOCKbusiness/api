import { EntityRepository, Repository } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';

@EntityRepository(Reward)
export class RewardRepository extends Repository<Reward> {}
