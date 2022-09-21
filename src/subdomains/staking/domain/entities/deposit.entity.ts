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

  @Column({ length: 256, nullable: false })
  status: DepositStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @Column({ length: 256, nullable: true })
  txId: string;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number, txId: string): Deposit {
    if (!txId) throw new BadRequestException('TxID must be provided when creating a staking deposit');

    const deposit = new Deposit();

    deposit.staking = staking;
    deposit.status = DepositStatus.PENDING;
    deposit.asset = staking.asset;
    deposit.amount = amount;
    deposit.txId = txId;

    return deposit;
  }

  //*** PUBLIC API ***//

  confirmDeposit(txId: string): this {
    if (this.txId !== txId) throw new BadRequestException('Provided wrong txId for deposit, txId does not match.');

    this.status = DepositStatus.CONFIRMED;

    return this;
  }
}
