import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { RewardRoute } from '../../domain/entities/reward-route.entity';

@Injectable()
export class RewardRouteRepository extends BaseRepository<RewardRoute> {
  constructor(manager: EntityManager) {
    super(RewardRoute, manager);
  }
}
