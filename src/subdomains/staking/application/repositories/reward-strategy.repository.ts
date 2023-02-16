import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { RewardStrategy } from '../../domain/entities/reward-strategy.entity';

@Injectable()
export class RewardStrategyRepository extends Repository<RewardStrategy> {
  constructor(manager: EntityManager) {
    super(RewardStrategy, manager);
  }
}
