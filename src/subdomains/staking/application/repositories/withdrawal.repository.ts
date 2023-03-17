import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { Between, EntityManager, FindOperator, In } from 'typeorm';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';

@Injectable()
export class WithdrawalRepository extends BaseRepository<Withdrawal> {
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

  async getPayingOut(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.PAYING_OUT], stakingId);
  }

  async getDrafts(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.DRAFT], stakingId);
  }

  async getInProgress(stakingId: number): Promise<Withdrawal[]> {
    return this.getByStatuses([WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT], stakingId);
  }

  private async getByStatuses(statuses: WithdrawalStatus[], stakingId: number): Promise<Withdrawal[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { status: In(statuses), staking: { id: stakingId } }, relations: ['staking'] });
  }

  async getWithdrawalByKey(key: string, value: any): Promise<Withdrawal> {
    return this.createQueryBuilder('withdrawal')
      .select('withdrawal')
      .leftJoinAndSelect('withdrawal.staking', 'staking')
      .where(`withdrawal.${key} = :param`, { param: value })
      .getOne();
  }

  async getByUserId(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Withdrawal[]> {
    return this.find({
      where: { staking: { userId }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking', 'asset'],
      loadEagerRelations: false,
      order: { id: 'DESC' },
    });
  }

  async getByDepositAddress(depositAddress: string, dateFrom?: Date, dateTo?: Date): Promise<Withdrawal[]> {
    return this.find({
      where: { staking: { depositAddress: { address: depositAddress } }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking', 'asset'],
      loadEagerRelations: false,
    });
  }

  async getStakingIdsForPayingOut(): Promise<number[]> {
    return this.find({
      where: { status: WithdrawalStatus.PAYING_OUT },
      relations: ['staking'],
      loadEagerRelations: false,
    }).then((s) => s.map((i) => i.staking.id));
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

  async getInProgressAmount(stakingId: number, assetId: number): Promise<number> {
    return this.createQueryBuilder('withdrawal')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status IN (:...statusList)', { statusList: [WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT] })
      .andWhere('withdrawal.assetId = :id', { id: assetId })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getPendingAmount(assetId: number): Promise<number> {
    return this.createQueryBuilder('withdrawal')
      .select('SUM(amount)', 'amount')
      .where('status IN (:...statusList)', { statusList: [WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT] })
      .andWhere('withdrawal.assetId = :id', { id: assetId })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  private dateQuery(from?: Date, to?: Date): { outputDate: FindOperator<Date> } | undefined {
    return from || to ? { outputDate: Between(from ?? new Date(0), to ?? new Date()) } : undefined;
  }
}
