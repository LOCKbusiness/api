import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { PayInBlockchainAddress } from './payin-blockchain-address.entity';

export enum PayInPurpose {
  CRYPTO_STAKING = 'CryptoStaking',
}

export enum PayInStatus {
  CREATED = 'Created',
  ACKNOWLEDGED = 'Acknowledged',
}

@Entity()
export class PayIn extends IEntity {
  @Column({ nullable: false })
  status: PayInStatus;

  @Column()
  txId: string;

  @Column()
  txType: string;

  @OneToOne(() => PayInBlockchainAddress, { eager: true, cascade: true })
  @JoinColumn()
  address: PayInBlockchainAddress;

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
    address: PayInBlockchainAddress,
    txType: string,
    txId: string,
    blockHeight: number,
    amount: number,
    asset: Asset,
  ): PayIn {
    const payIn = new PayIn();

    payIn.address = address;
    payIn.txType = txType;
    payIn.txId = txId;
    payIn.blockHeight = blockHeight;
    payIn.amount = amount;
    payIn.asset = asset;
    payIn.status = PayInStatus.CREATED;

    return payIn;
  }

  acknowledge(purpose: PayInPurpose): this {
    this.purpose = purpose;
    this.status = PayInStatus.ACKNOWLEDGED;

    return this;
  }

  return(returnTxId: string): this {
    this.returnTxId = returnTxId;

    return this;
  }
}
