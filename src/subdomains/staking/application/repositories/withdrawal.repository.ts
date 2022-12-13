import { NotFoundException } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { EntityRepository, In, Repository } from 'typeorm';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { StakingStrategy, WithdrawalStatus } from '../../domain/enums';

@EntityRepository(Withdrawal)
export class WithdrawalRepository extends Repository<Withdrawal> {
  async getByIdOrThrow(withdrawalId: number): Promise<Withdrawal> {
    const withdrawal = await this.findOne({ id: withdrawalId });

    if (!withdrawal) throw new NotFoundException('Withdrawal not found');

    return withdrawal;
  }

  async getAllPending(): Promise<Withdrawal[]> {
    return this.find({ where: { status: WithdrawalStatus.PENDING } });
  }

  async getConfirmedAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('withdrawals')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: WithdrawalStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getTotalConfirmedAmountSince(asset: Asset, strategy: StakingStrategy, date: Date): Promise<number> {
    return this.createQueryBuilder('withdrawals')
      .leftJoin('withdrawals.staking', 'staking')
      .select('SUM(amount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('withdrawals.status = :status', { status: WithdrawalStatus.CONFIRMED })
      .andWhere('withdrawals.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
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

  async getByStatuses(statuses: WithdrawalStatus[], stakingId: number): Promise<Withdrawal[]> {
    return this.find({ status: In(statuses), staking: { id: stakingId } });
  }

  async getByUserId(userId: number): Promise<Withdrawal[]> {
    return this.find({ staking: { userId } });
  }

  async getByDepositAddress(depositAddress: string): Promise<Withdrawal[]> {
    return this.find({ staking: { depositAddress: { address: depositAddress } } });
  }

  async getInProgressAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('withdrawals')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status IN (:pending, :payingOut)', {
        pending: WithdrawalStatus.PENDING,
        payingOut: WithdrawalStatus.PAYING_OUT,
      })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getStakingIdsForPayingOut(): Promise<number[]> {
    return this.find({ status: WithdrawalStatus.PAYING_OUT }).then((s) => s.map((i) => i.staking.id));
  }
}
