import { EntityRepository, Repository } from 'typeorm';
import { RewardBatch } from '../../domain/entities/reward-batch.entity';

@EntityRepository(RewardBatch)
export class RewardBatchRepository extends Repository<RewardBatch> {}
