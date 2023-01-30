import { BadRequestException } from '@nestjs/common';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Price } from 'src/shared/models/price';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { DepositStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
@Index((d: Deposit) => [d.staking, d.status, d.created])
export class Deposit extends IEntity {
  @ManyToOne(() => Staking, { eager: true, nullable: false })
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

  @Column({ type: 'float', nullable: true, default: null })
  amountEur: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountUsd: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountChf: number;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number, payInTxId: string, asset: Asset): Deposit {
    if (!payInTxId) throw new BadRequestException('TxID must be provided when creating a staking deposit');

    const deposit = new Deposit();

    deposit.staking = staking;
    deposit.status = DepositStatus.OPEN;
    deposit.asset = asset;
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
    this.status = DepositStatus.PENDING;
  }

  calculateFiatReferences(prices: Price[]): this {
    this.amountChf = Staking.calculateFiatReferenceAmount(Fiat.CHF, this.asset.name, this.amount, prices);
    this.amountUsd = Staking.calculateFiatReferenceAmount(Fiat.USD, this.asset.name, this.amount, prices);
    this.amountEur = Staking.calculateFiatReferenceAmount(Fiat.EUR, this.asset.name, this.amount, prices);

    return this;
  }
}
