import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { RewardBatch } from '../../domain/entities/reward-batch.entity';

@Injectable()
export class RewardBatchRepository extends Repository<RewardBatch> {
  constructor(manager: EntityManager) {
    super(RewardBatch, manager);
  }
}
