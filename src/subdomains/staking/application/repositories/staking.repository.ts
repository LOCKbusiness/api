import { LockedRepository } from 'src/shared/repositories/locked.repository';
import { DeepPartial, EntityRepository } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';

@EntityRepository(Staking)
export class StakingRepository extends LockedRepository<Staking> {
  async getByType(type: DeepPartial<StakingType>): Promise<Staking[]> {
    return this.find({ where: type, relations: ['asset'] });
  }

  async getByUserId(userId: number, type?: DeepPartial<StakingType>): Promise<Staking[]> {
    return this.find({ where: { userId, ...type }, relations: ['asset'] });
  }

  async getByDepositAddress(depositAddress: string): Promise<Staking[]> {
    return this.find({ depositAddress: { address: depositAddress } });
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
