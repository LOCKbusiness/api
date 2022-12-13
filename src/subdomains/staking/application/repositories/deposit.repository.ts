import { Asset } from 'src/shared/models/asset/asset.entity';
import { Util } from 'src/shared/util';
import { EntityRepository, In, Repository } from 'typeorm';
import { Deposit } from '../../domain/entities/deposit.entity';
import { DepositStatus, StakingStrategy } from '../../domain/enums';

@EntityRepository(Deposit)
export class DepositRepository extends Repository<Deposit> {
  async getConfirmed(stakingId: number): Promise<Deposit[]> {
    return this.getByStatuses([DepositStatus.CONFIRMED], stakingId);
  }

  async getConfirmedAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposits')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getConfirmedStageOneAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposits')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('created = :created', { created: DepositStatus.CONFIRMED })
      .andWhere('created >= :date', { date: Util.daysBefore(2) })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getConfirmedStageTwoAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposits')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('created >= :date', { date: Util.daysBefore(6) })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getTotalConfirmedAmountSince(asset: Asset, strategy: StakingStrategy, date: Date): Promise<number> {
    return this.createQueryBuilder('deposits')
      .leftJoin('deposits.staking', 'staking')
      .select('SUM(amount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('deposits.status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('deposits.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
  }

  async getPending(stakingId: number): Promise<Deposit[]> {
    return this.getByStatuses([DepositStatus.PENDING], stakingId);
  }

  async getByStatuses(statuses: DepositStatus[], stakingId: number): Promise<Deposit[]> {
    return this.find({ status: In(statuses), staking: { id: stakingId } });
  }

  async getByPayInTxId(stakingId: number, payInTxId: string): Promise<Deposit> {
    return this.findOne({ staking: { id: stakingId }, payInTxId });
  }

  async getByUserId(userId: number): Promise<Deposit[]> {
    return this.find({ staking: { userId } });
  }

  async getByDepositAddress(depositAddress: string): Promise<Deposit[]> {
    return this.find({ staking: { depositAddress: { address: depositAddress } } });
  }

  async getInProgressAmount(stakingId: number): Promise<number> {
    return this.createQueryBuilder('deposits')
      .select('SUM(amount)', 'amount')
      .where('stakingId = :stakingId', { stakingId })
      .andWhere('status IN (:pending, :open)', { pending: DepositStatus.PENDING, open: DepositStatus.OPEN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
  }

  async getStakingIdsForPending(): Promise<number[]> {
    return this.find({ status: DepositStatus.PENDING }).then((s) => s.map((i) => i.staking.id));
  }
}
