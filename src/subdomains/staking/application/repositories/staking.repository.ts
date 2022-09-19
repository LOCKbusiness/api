import { EntityRepository, Repository } from 'typeorm';
import { Staking } from '../../domain/entities/staking.entity';

@EntityRepository(Staking)
export class StakingRepository extends Repository<Staking> {}
