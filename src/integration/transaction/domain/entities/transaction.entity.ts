import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity } from 'typeorm';
import { TransactionDirection } from '../enums';

@Entity()
export class Transaction extends IEntity {
  @Column({ unique: true })
  chainId: string;

  @Column({ length: 'MAX', nullable: true })
  payload: string;

  @Column({ length: 'MAX' })
  rawTx: string;

  @Column()
  issuerSignature: string;

  @Column({ nullable: true })
  verifierSignature: string;

  @Column({ default: false })
  inBlockchain: boolean;

  @Column({ length: 'MAX', nullable: true })
  signedHex: string;

  @Column({ nullable: true })
  invalidationReason: string;

  static create(
    id: string,
    rawTx: RawTxDto,
    payload: any,
    issuerSignature: string,
    _direction: TransactionDirection,
  ): Transaction {
    const tx = new Transaction();
    tx.chainId = id;
    tx.rawTx = JSON.stringify(rawTx);
    tx.issuerSignature = issuerSignature;
    // deactivated until other parts are up-to-date
    // if (direction === TransactionDirection.INCOMING) tx.verifierSignature = issuerSignature;
    tx.payload = payload && JSON.stringify(payload);
    tx.invalidationReason = null;
    return tx;
  }

  verified(signature: string): this {
    this.verifierSignature = signature;
    return this;
  }

  get isVerified(): boolean {
    return this.verifierSignature != null;
  }

  signed(hex: string): this {
    this.signedHex = hex;
    return this;
  }

  get isSigned(): boolean {
    return this.signedHex != null;
  }

  invalidated(reason?: string): this {
    this.inBlockchain = false;
    this.invalidationReason = reason;
    this.signedHex = null;
    return this;
  }

  get isInvalidated(): boolean {
    return this.invalidationReason != null;
  }

  foundOnBlockchain(): this {
    this.inBlockchain = true;
    this.invalidationReason = null;
    return this;
  }

  notFoundOnBlockchain(): this {
    this.inBlockchain = false;
    this.invalidationReason = 'Not found on blockchain';
    return this;
  }
}
