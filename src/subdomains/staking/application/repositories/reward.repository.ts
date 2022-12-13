import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { EntityRepository, Repository } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardStatus, StakingStrategy } from '../../domain/enums';

@EntityRepository(Reward)
export class RewardRepository extends Repository<Reward> {
  async getByUserId(userId: number): Promise<Reward[]> {
    return this.find({ staking: { userId } });
  }

  async getByDepositAddress(depositAddress: string): Promise<Reward[]> {
    return this.find({ staking: { depositAddress: { address: depositAddress } } });
  }

  async getRewardsAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('rewards')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: RewardStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getAllRewardsAmountForCondition(
    asset: Asset,
    strategy: StakingStrategy,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<number> {
    return this.createQueryBuilder('rewards')
      .leftJoin('rewards.staking', 'staking')
      .select('SUM(amount)', 'rewardVolume')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('rewards.reinvestOutputDate BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne<{ rewardVolume: number }>()
      .then((r) => r.rewardVolume);
  }

  async getDfiAmountForNewRewards(): Promise<number> {
    return this.createQueryBuilder('rewards')
      .leftJoin('rewards.referenceAsset', 'referenceAsset')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('status = :status', { status: RewardStatus.CREATED })
      .andWhere('referenceAsset.name = :name', { name: 'DFI' })
      .andWhere('referenceAsset.blockchain = :blockchain', { blockchain: Blockchain.DEFICHAIN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }
}
