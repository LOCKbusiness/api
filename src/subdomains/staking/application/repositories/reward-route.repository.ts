import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { RewardRoute } from '../../domain/entities/reward-route.entity';

@Injectable()
export class RewardRouteRepository extends Repository<RewardRoute> {
  constructor(manager: EntityManager) {
    super(RewardRoute, manager);
  }
}
