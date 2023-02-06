import { Injectable } from '@nestjs/common';
import { Between, EntityManager, FindOperator, IsNull, Not, Repository } from 'typeorm';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingType } from '../../domain/entities/staking.entity';
import { RewardStatus } from '../../domain/enums';

@Injectable()
export class RewardRepository extends Repository<Reward> {
  constructor(manager: EntityManager) {
    super(Reward, manager);
  }

  async getByUserId(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Reward[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: { staking: { userId }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking'],
    });
  }

  async getByDepositAddress(depositAddress: string, dateFrom?: Date, dateTo?: Date): Promise<Reward[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: { staking: { depositAddress: { address: depositAddress } }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking'],
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

  async getAllRewardsAmountForCondition({ strategy }: StakingType, dateFrom: Date, dateTo: Date): Promise<number> {
    // TODO: this is wrong for multi-asset staking
    return this.createQueryBuilder('reward')
      .leftJoin('reward.staking', 'staking')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('reward.status = :status', { status: RewardStatus.CONFIRMED })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('reward.outputDate BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
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
        status: RewardStatus.CREATED,
      },
      relations: ['staking', 'batch'],
    });
  }
}
