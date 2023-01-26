import { Util } from 'src/shared/util';
import { Between, EntityRepository, FindOperator, In, Repository } from 'typeorm';
import { Deposit } from '../../domain/entities/deposit.entity';
import { StakingReference, StakingType } from '../../domain/entities/staking.entity';
import { DepositStatus } from '../../domain/enums';

@EntityRepository(Deposit)
export class DepositRepository extends Repository<Deposit> {
  async getConfirmed(stakingId: number): Promise<Deposit[]> {
    return this.getByStatuses([DepositStatus.CONFIRMED], stakingId);
  }

  async getPending(stakingId: number): Promise<Deposit[]> {
    return this.getByStatuses([DepositStatus.PENDING], stakingId);
  }

  async getByStatuses(statuses: DepositStatus[], stakingId: number): Promise<Deposit[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({ where: { status: In(statuses), staking: { id: stakingId } }, relations: ['staking'] });
  }

  async getByPayInTxId(stakingId: number, payInTxId: string): Promise<Deposit> {
    return this.findOneBy({ staking: { id: stakingId }, payInTxId });
  }

  async getByUserId(userId: number, dateFrom?: Date, dateTo?: Date): Promise<Deposit[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: { staking: { userId }, ...this.dateQuery(dateFrom, dateTo) },
      relations: ['staking'],
    });
  }

  async getByDepositAddress(depositAddress: string, dateFrom?: Date, dateTo?: Date): Promise<Deposit[]> {
    /**
     * @note
     * relations are needed for #find(...) even though field is eager
     */
    return this.find({
      where: {
        staking: { depositAddress: { address: depositAddress } },
        ...this.dateQuery(dateFrom, dateTo),
      },
      relations: ['staking'],
    });
  }

  async getStakingReferencesForPending(): Promise<StakingReference[]> {
    return this.findBy({ status: DepositStatus.PENDING })
      .then((d) => d.map(({ staking: s }) => ({ id: s.id, strategy: s.strategy })))
      .then((refs) => refs.filter((r1, i, a) => a.findIndex((r2) => r1.id === r2.id) === i));
  }

  async getConfirmedAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposit')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getConfirmedStageOneAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposit')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('created >= :date', { date: Util.daysBefore(2) })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getConfirmedStageTwoAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposit')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('created >= :date', { date: Util.daysBefore(6) })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getInProgressAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposit')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status IN (:pending, :open)', { pending: DepositStatus.PENDING, open: DepositStatus.OPEN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount ?? 0);
  }

  async getTotalConfirmedAmountSince({ asset, strategy }: StakingType, date: Date): Promise<number> {
    return this.createQueryBuilder('deposit')
      .leftJoin('deposit.staking', 'staking')
      .select('SUM(amount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('deposit.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount ?? 0);
  }

  private dateQuery(from?: Date, to?: Date): { created: FindOperator<Date> } | undefined {
    return from || to ? { created: Between(from ?? new Date(0), to ?? new Date()) } : undefined;
  }
}
