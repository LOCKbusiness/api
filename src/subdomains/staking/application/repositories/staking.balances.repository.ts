import { Injectable } from '@nestjs/common';
import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { EntityManager } from 'typeorm';
import { StakingBalance } from '../../domain/entities/staking.balances.entity';

@Injectable()
export class StakingAssetRepository extends LockedRepository<StakingBalance> {
  constructor(manager: EntityManager) {
    super(StakingBalance, manager);
  }
}
