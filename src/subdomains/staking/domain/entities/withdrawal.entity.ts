import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { WithdrawalStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Withdrawal extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.withdrawals, { eager: true, nullable: true })
  staking: Staking;

  @Column({ length: 256, nullable: false })
  status: WithdrawalStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @Column({ type: 'datetime2', nullable: true })
  outputDate: Date;

  @Column({ length: 256, nullable: true })
  txId: string;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number): Withdrawal {
    const withdrawal = new Withdrawal();

    withdrawal.staking = staking;
    withdrawal.status = WithdrawalStatus.PENDING;
    withdrawal.asset = staking.asset;
    withdrawal.amount = amount;

    return withdrawal;
  }

  //*** PUBLIC API ***//

  payoutWithdrawal(): this {
    this.status = WithdrawalStatus.PAYING_OUT;

    return this;
  }

  confirmWithdrawal(outputDate: Date, txId: string): this {
    this.status = WithdrawalStatus.CONFIRMED;

    this.outputDate = outputDate;
    this.txId = txId;

    return this;
  }

  failWithdrawal(): this {
    this.status = WithdrawalStatus.FAILED;

    return this;
  }
}
