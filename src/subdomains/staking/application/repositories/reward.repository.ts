import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { EntityRepository, Repository } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingType } from '../../domain/entities/staking.entity';
import { RewardStatus } from '../../domain/enums';

@EntityRepository(Reward)
export class RewardRepository extends Repository<Reward> {
  async getByUserId(userId: number): Promise<Reward[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { staking: { userId } }, relations: ['staking'] });
  }

  async getByDepositAddress(depositAddress: string): Promise<Reward[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { staking: { depositAddress: { address: depositAddress } } }, relations: ['staking'] });
  }

  async getRewardsAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('reward')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: RewardStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getAllRewardsAmountForCondition(
    { asset, strategy }: StakingType,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<number> {
    return this.createQueryBuilder('reward')
      .leftJoin('reward.staking', 'staking')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('reward.status = :status', { status: RewardStatus.CONFIRMED })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('reward.outputDate BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getDfiAmountForNewRewards(): Promise<number> {
    return this.createQueryBuilder('reward')
      .leftJoin('reward.referenceAsset', 'referenceAsset')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('reward.status = :status', { status: RewardStatus.CREATED })
      .andWhere('referenceAsset.name = :name', { name: 'DFI' })
      .andWhere('referenceAsset.blockchain = :blockchain', { blockchain: Blockchain.DEFICHAIN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }
}
