import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum PayInCryptoPurpose {
  CRYPTO_STAKING = 'CryptoStaking',
}

export enum PayInCryptoStatus {
  CREATED = 'Created',
}

@Entity()
export class PayInCrypto extends IEntity {
  @Column({ length: 256, nullable: false })
  status: PayInCryptoStatus;

  @Column({ length: 256 })
  txId: string;

  @Column({ length: 256, nullable: true })
  returnTxId: string;

  @Column({ type: 'integer', nullable: true })
  blockHeight: number;

  @Column({ type: 'float' })
  amount: number;

  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @Column({ length: 256, nullable: false })
  purpose: PayInCryptoPurpose;

  acknowledge(): this {
    return this;
  }

  return(returnTxId: string): this {
    this.returnTxId = returnTxId;

    return this;
  }
}
