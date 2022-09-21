import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum PayInPurpose {
  CRYPTO_STAKING = 'CryptoStaking',
}

export enum PayInStatus {
  CREATED = 'Created',
}

@Entity()
export class PayIn extends IEntity {
  @Column({ length: 256, nullable: false })
  status: PayInStatus;

  @Column({ length: 256 })
  txId: string;

  @Column({ length: 256 })
  txType: string;

  @Column({ length: 256 })
  txSource: BlockchainAddress;

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

  @Column({ nullable: true })
  acknowledged: boolean;

  //*** FACTORY METHODS ***//

  static create(
    txSource: BlockchainAddress,
    txType: string,
    txId: string,
    blockHeight: number,
    amount: number,
    asset: Asset,
  ): PayIn {
    const payIn = new PayIn();

    payIn.txSource = txSource;
    payIn.txType = txType;
    payIn.txId = txId;
    payIn.blockHeight = blockHeight;
    payIn.amount = amount;
    payIn.asset = asset;

    return payIn;
  }

  acknowledge(purpose: PayInPurpose): this {
    this.purpose = purpose;
    this.acknowledged = true;

    return this;
  }

  return(returnTxId: string): this {
    this.returnTxId = returnTxId;

    return this;
  }
}
