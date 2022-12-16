import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { EntityRepository, Repository } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingType } from '../../domain/entities/staking.entity';
import { RewardStatus } from '../../domain/enums';

@EntityRepository(Reward)
export class RewardRepository extends Repository<Reward> {
  async getByUserId(userId: number): Promise<Reward[]> {
    return this.find({ staking: { userId } });
  }

  async getByDepositAddress(depositAddress: string): Promise<Reward[]> {
    return this.find({ staking: { depositAddress: { address: depositAddress } } });
  }

  async getRewardsAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('reward')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: RewardStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getAllRewardsAmountForCondition(
    { asset, strategy }: StakingType,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<number> {
    return this.createQueryBuilder('reward')
      .leftJoin('reward.staking', 'staking')
      .select('SUM(outputReferenceAmount)', 'rewardVolume')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('status = :status', { status: RewardStatus.CONFIRMED })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('reward.outputDate BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne<{ rewardVolume: number }>()
      .then((r) => r.rewardVolume);
  }

  async getDfiAmountForNewRewards(): Promise<number> {
    return this.createQueryBuilder('reward')
      .leftJoin('reward.referenceAsset', 'referenceAsset')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('status = :status', { status: RewardStatus.CREATED })
      .andWhere('referenceAsset.name = :name', { name: 'DFI' })
      .andWhere('referenceAsset.blockchain = :blockchain', { blockchain: Blockchain.DEFICHAIN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }
}
