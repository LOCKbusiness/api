import { Injectable } from '@nestjs/common';
import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { EntityManager } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { StakingStrategy } from '../../domain/enums';

@Injectable()
export class StakingRepository extends LockedRepository<Staking> {
  constructor(manager: EntityManager) {
    super(Staking, manager);
  }

  async getByStrategy(strategy: StakingStrategy): Promise<Staking[]> {
    return this.findBy({ strategy });
  }

  async getByUserId(userId: number): Promise<Staking[]> {
    return this.findBy({ userId });
  }

  async getByDepositAddress(depositAddress: string): Promise<Staking[]> {
    return this.findBy({ depositAddress: { address: depositAddress } });
  }

  async getCurrentTotalStakingBalance({ asset, strategy }: StakingType): Promise<number> {
    return this.createQueryBuilder('staking')
      .leftJoin('staking.balances', 'balance')
      .select('SUM(balance.balance)', 'balance')
      .where('balance.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
  }
}
