import { Injectable } from '@nestjs/common';
import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { EntityManager, FindOptionsWhere } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';

@Injectable()
export class StakingRepository extends LockedRepository<Staking> {
  constructor(manager: EntityManager) {
    super(Staking, manager);
  }

  async getByType(type: FindOptionsWhere<StakingType>): Promise<Staking[]> {
    return this.find({ where: type, relations: ['asset'] });
  }

  async getByUserId(userId: number, type?: FindOptionsWhere<StakingType>): Promise<Staking[]> {
    return this.find({ where: { userId, ...type }, relations: ['asset'] });
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
