import { BadRequestException } from '@nestjs/common';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Asset } from 'src/shared/entities/asset.entity';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { DepositStatus } from '../enums';
import { Staking } from './staking.entity';
import { Price } from 'src/shared/entities/price';

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

  @Column({ nullable: true, type: 'bigint' })
  payInTxSequence: number;

  @Column({ nullable: true })
  forwardTxId: string;

  @Column({ type: 'float', nullable: true, default: null })
  amountEur: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountUsd: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountChf: number;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, asset: Asset, amount: number, payInTxId: string, payInTxSequence?: number): Deposit {
    if (!payInTxId) throw new BadRequestException('TxID must be provided when creating a staking deposit');

    const deposit = new Deposit();

    deposit.staking = staking;
    deposit.status = DepositStatus.OPEN;
    deposit.asset = asset;
    deposit.amount = amount;
    deposit.payInTxId = payInTxId;
    deposit.payInTxSequence = payInTxSequence;

    return deposit;
  }

  //*** PUBLIC API ***//

  confirmDeposit(forwardTxId: string): this {
    this.forwardTxId = forwardTxId;
    this.status = DepositStatus.CONFIRMED;

    return this;
  }

  updatePreCreatedDeposit(payInTxId: string, payInTxSequence: number, amount: number, asset: Asset) {
    if (this.payInTxId !== payInTxId) {
      throw new BadRequestException('Provided wrong payInTxId for deposit, payInTxId does not match.');
    }

    this.payInTxSequence = payInTxSequence;
    this.amount = amount;
    this.asset = asset;
    this.status = DepositStatus.PENDING;
  }

  calculateFiatReferences(prices: Price[]): this {
    this.amountChf = Staking.calculateFiatReferenceAmount(Fiat.CHF, this.asset.name, this.amount, prices);
    this.amountUsd = Staking.calculateFiatReferenceAmount(Fiat.USD, this.asset.name, this.amount, prices);
    this.amountEur = Staking.calculateFiatReferenceAmount(Fiat.EUR, this.asset.name, this.amount, prices);

    return this;
  }
}
