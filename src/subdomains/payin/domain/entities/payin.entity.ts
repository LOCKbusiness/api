import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum PayInPurpose {
  STAKING = 'Staking',
}

export enum PayInStatus {
  CREATED = 'Created',
  CONFIRMED = 'Confirmed',
  ACKNOWLEDGED = 'Acknowledged',
  FAILED = 'Failed',
}

@Entity()
export class PayIn extends IEntity {
  @Column({ nullable: false })
  status: PayInStatus;

  @Column()
  txId: string;

  @Column({ nullable: true, type: 'bigint' })
  txSequence: number;

  @Column()
  txType: string;

  @Column(() => BlockchainAddress)
  address: BlockchainAddress;

  @Column({ nullable: true })
  returnTxId: string;

  @Column({ type: 'integer' })
  blockHeight: number;

  @Column({ type: 'float' })
  amount: number;

  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @Column({ nullable: true })
  purpose: PayInPurpose;

  //*** FACTORY METHODS ***//

  static create(
    address: BlockchainAddress,
    txType: string,
    txId: string,
    txSequence: number,
    blockHeight: number,
    amount: number,
    asset: Asset,
    isConfirmed: boolean,
  ): PayIn {
    const payIn = new PayIn();

    payIn.address = address;
    payIn.txType = txType;
    payIn.txId = txId;
    payIn.txSequence = txSequence;
    payIn.blockHeight = blockHeight;
    payIn.amount = amount;
    payIn.asset = asset;
    payIn.status = isConfirmed ? PayInStatus.CONFIRMED : PayInStatus.CREATED;

    return payIn;
  }

  confirm(): this {
    this.status = PayInStatus.CONFIRMED;

    return this;
  }

  acknowledge(purpose: PayInPurpose): this {
    this.purpose = purpose;
    this.status = PayInStatus.ACKNOWLEDGED;

    return this;
  }

  fail(purpose: PayInPurpose): this {
    this.purpose = purpose;
    this.status = PayInStatus.FAILED;

    return this;
  }

  return(returnTxId: string): this {
    this.returnTxId = returnTxId;

    return this;
  }
}
