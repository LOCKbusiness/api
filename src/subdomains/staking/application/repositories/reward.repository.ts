import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { Between, EntityManager, FindOperator, IsNull, Not } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardStatus } from '../../domain/enums';

@Injectable()
export class RewardRepository extends BaseRepository<Reward> {
  constructor(manager: EntityManager) {
    super(Reward, manager);
  }

  async getRewardByKey(key: string, value: any): Promise<Reward> {
    return this.createQueryBuilder('reward')
      .select('reward')
      .leftJoinAndSelect('reward.staking', 'staking')
      .where(`reward.${key} = :param`, { param: value })
      .getOne();
  }

  async getByUserId(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Reward[]> {
    return this.find({
      where: { staking: { userId }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking', 'referenceAsset', 'targetAsset'],
      loadEagerRelations: false,
      order: { id: 'DESC' },
    });
  }

  async getByDepositAddress(depositAddress: string, dateFrom?: Date, dateTo?: Date): Promise<Reward[]> {
    return this.find({
      where: { staking: { depositAddress: { address: depositAddress } }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking', 'referenceAsset', 'targetAsset'],
      loadEagerRelations: false,
    });
  }

  private dateQuery(from?: Date, to?: Date): { outputDate: FindOperator<Date> } | undefined {
    return from || to ? { outputDate: Between(from ?? new Date(0), to ?? new Date()) } : undefined;
  }

  async getRewardsAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('reward')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: RewardStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getNewRewards(): Promise<Reward[]> {
    return this.find({
      where: {
        referenceAsset: Not(IsNull()),
        outputReferenceAmount: Not(IsNull()),
        rewardRoute: Not(IsNull()),
        batch: IsNull(),
        status: RewardStatus.READY,
      },
      relations: ['batch', 'staking', 'rewardRoute', 'referenceAsset', 'targetAsset'],
      loadEagerRelations: false,
    });
  }
}
