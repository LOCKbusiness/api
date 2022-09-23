import { BadRequestException } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { DepositStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Deposit extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.deposits, { eager: true, nullable: true })
  staking: Staking;

  @Column({ nullable: false })
  status: DepositStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @Column({ nullable: true })
  payInTxId: string;

  @Column({ nullable: true })
  forwardTxId: string;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number, payInTxId: string): Deposit {
    if (!payInTxId) throw new BadRequestException('TxID must be provided when creating a staking deposit');

    const deposit = new Deposit();

    deposit.staking = staking;
    deposit.status = DepositStatus.PENDING;
    deposit.asset = staking.asset;
    deposit.amount = amount;
    deposit.payInTxId = payInTxId;

    return deposit;
  }

  //*** PUBLIC API ***//

  confirmDeposit(forwardTxId: string): this {
    this.forwardTxId = forwardTxId;
    this.status = DepositStatus.CONFIRMED;

    return this;
  }

  updatePreCreatedDeposit(payInTxId: string, amount: number) {
    if (this.payInTxId !== payInTxId) {
      throw new BadRequestException('Provided wrong payInTxId for deposit, payInTxId does not match.');
    }

    this.amount = amount;
  }
}
