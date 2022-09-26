import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { WithdrawalStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Withdrawal extends IEntity {
  @Column({ nullable: false })
  signature: string;

  @ManyToOne(() => Staking, (staking) => staking.withdrawals, { nullable: true })
  staking: Staking;

  @Column({ nullable: false })
  status: WithdrawalStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @Column({ type: 'datetime2', nullable: true })
  outputDate: Date;

  @Column({ nullable: true })
  withdrawalTxId: string;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number, signature: string): Withdrawal {
    const withdrawal = new Withdrawal();

    withdrawal.signature = signature;
    withdrawal.staking = staking;
    withdrawal.status = WithdrawalStatus.PENDING;
    withdrawal.asset = staking.asset;
    withdrawal.amount = amount;

    return withdrawal;
  }

  //*** PUBLIC API ***//

  designateWithdrawalPayout(withdrawalTxId: string): this {
    this.status = WithdrawalStatus.PAYING_OUT;
    this.withdrawalTxId = withdrawalTxId;

    return this;
  }

  confirmWithdrawal(): this {
    this.status = WithdrawalStatus.CONFIRMED;

    this.outputDate = new Date();

    return this;
  }

  failWithdrawal(): this {
    this.status = WithdrawalStatus.FAILED;

    return this;
  }
}
