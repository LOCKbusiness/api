import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { RewardBatch } from '../../domain/entities/reward-batch.entity';

@Injectable()
export class RewardBatchRepository extends BaseRepository<RewardBatch> {
  constructor(manager: EntityManager) {
    super(RewardBatch, manager);
  }
}
