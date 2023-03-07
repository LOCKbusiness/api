import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { RewardStrategy } from '../../domain/entities/reward-strategy.entity';

@Injectable()
export class RewardStrategyRepository extends BaseRepository<RewardStrategy> {
  constructor(manager: EntityManager) {
    super(RewardStrategy, manager);
  }
}
