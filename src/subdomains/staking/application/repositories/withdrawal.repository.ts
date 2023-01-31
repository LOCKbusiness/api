import { Injectable } from '@nestjs/common';
import { Between, EntityManager, FindOperator, In, Repository } from 'typeorm';
import { StakingType } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';

@Injectable()
export class WithdrawalRepository extends Repository<Withdrawal> {
  constructor(manager: EntityManager) {
    super(Withdrawal, manager);
  }

  async getAllPending(): Promise<Withdrawal[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { status: WithdrawalStatus.PENDING }, relations: ['staking'] });
  }

  async getPending(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.PENDING], stakingId);
  }

  async getPayingOut(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.PAYING_OUT], stakingId);
  }

  async getDrafts(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.DRAFT], stakingId);
  }

  async getInProgress(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT], stakingId);
  }

  async getByStatuses(statuses: WithdrawalStatus[], stakingId: number): Promise<Withdrawal[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { status: In(statuses), staking: { id: stakingId } }, relations: ['staking'] });
  }

  async getByUserId(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Withdrawal[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: { staking: { userId }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking'],
    });
  }

  async getByDepositAddress(depositAddress: string, dateFrom?: Date, dateTo?: Date): Promise<Withdrawal[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: { staking: { depositAddress: { address: depositAddress } }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking'],
    });
  }

  async getStakingIdsForPayingOut(): Promise<number[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { status: WithdrawalStatus.PAYING_OUT }, relations: ['staking'] }).then((s) =>
      s.map((i) => i.staking.id),
    );
  }

  async getConfirmedAmount(stakingId: number, assetId: number): Promise<number> {
    return this.createQueryBuilder('withdrawal')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('assetId = :assetId', { assetId })
      .andWhere('status = :status', { status: WithdrawalStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getTotalConfirmedAmountSince({ strategy }: StakingType, date: Date): Promise<number> {
    // TODO: this is wrong for multi-asset staking
    return this.createQueryBuilder('withdrawal')
      .leftJoin('withdrawal.staking', 'staking')
      .select('SUM(amount)', 'amount')
      .where('staking.strategy = :strategy', { strategy })
      .andWhere('withdrawal.status = :status', { status: WithdrawalStatus.CONFIRMED })
      .andWhere('withdrawal.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount ?? 0);
  }

  async getInProgressAmount(stakingId: number, assetId: number): Promise<number> {
    return this.createQueryBuilder('withdrawal')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status IN (:pending, :payingOut)', {
        pending: WithdrawalStatus.PENDING,
        payingOut: WithdrawalStatus.PAYING_OUT,
      })
      .andWhere('withdrawal.assetId = :id', { id: assetId })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  private dateQuery(from?: Date, to?: Date): { outputDate: FindOperator<Date> } | undefined {
    return from || to ? { outputDate: Between(from ?? new Date(0), to ?? new Date()) } : undefined;
  }
}
