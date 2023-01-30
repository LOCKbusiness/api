import { Injectable } from '@nestjs/common';
import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { EntityManager } from 'typeorm';
import { StakingBalance } from '../../domain/entities/staking.balances.entity';
import { Staking } from '../../domain/entities/staking.entity';

export interface StakingBalanceFindOptions {
  staking: Staking;
  asset: { name: string };
}

@Injectable()
export class StakingAssetRepository extends LockedRepository<StakingBalance> {
  constructor(manager: EntityManager) {
    super(StakingBalance, manager);
  }

  async getByStrategy({ staking, asset }: StakingBalanceFindOptions): Promise<StakingBalance> {
    return this.findOne({
      where: { staking: { id: staking.id }, asset },
    });
  }
}
