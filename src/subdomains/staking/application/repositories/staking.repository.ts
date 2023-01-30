import { Injectable } from '@nestjs/common';
import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { EntityManager } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { StakingStrategy } from '../../domain/enums';

export interface StakingFindOptions {
  strategy: StakingStrategy;
}

@Injectable()
export class StakingRepository extends LockedRepository<Staking> {
  constructor(manager: EntityManager) {
    super(Staking, manager);
  }

  async getByStrategy({ strategy }: StakingFindOptions): Promise<Staking[]> {
    return this.find({
      where: { strategy },
    });
  }

  async getByUserId(userId: number): Promise<Staking[]> {
    return this.findBy({ userId });
  }

  async getByDepositAddress(depositAddress: string): Promise<Staking[]> {
    return this.findBy({ depositAddress: { address: depositAddress } });
  }

  async getCurrentTotalStakingBalance({ asset, strategy }: StakingType): Promise<number> {
    return this.createQueryBuilder('staking')
      .select('SUM(balance)', 'balance')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
  }
}
