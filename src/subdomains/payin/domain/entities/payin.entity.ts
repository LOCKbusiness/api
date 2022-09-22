import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
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
  @Column({ length: 256, nullable: false })
  status: PayInStatus;

  @Column({ length: 256 })
  txId: string;

  @Column({ length: 256 })
  txType: string;

  @OneToOne(() => PayInBlockchainAddress)
  address: PayInBlockchainAddress;

  @Column({ length: 256, nullable: true })
  returnTxId: string;

  @Column({ type: 'integer', nullable: true })
  blockHeight: number;

  @Column({ type: 'float' })
  amount: number;

  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @Column({ length: 256, nullable: false })
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
