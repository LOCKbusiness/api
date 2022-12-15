import { EntityRepository, Repository } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';

@EntityRepository(Staking)
export class StakingRepository extends Repository<Staking> {
  async getByUserId(userId: number, type?: StakingType): Promise<Staking[]> {
    return this.find({ userId, ...type });
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
