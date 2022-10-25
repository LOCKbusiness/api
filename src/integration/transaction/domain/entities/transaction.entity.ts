import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryColumn()
  id: string;

  @UpdateDateColumn()
  updated: Date;

  @CreateDateColumn()
  created: Date;

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

  static create(id: string, rawTx: RawTxDto, payload: any, issuerSignature: string): Transaction {
    const tx = new Transaction();
    tx.id = id;
    tx.rawTx = JSON.stringify(rawTx);
    tx.issuerSignature = issuerSignature;
    tx.payload = payload && JSON.stringify(payload);
    tx.invalidationReason = null;
    return tx;
  }

  verified(signature: string): this {
    this.verifierSignature = signature;
    return this;
  }

  signed(hex: string): this {
    this.signedHex = hex;
    return this;
  }

  invalidated(reason?: string): this {
    this.inBlockchain = false;
    this.invalidationReason = reason;
    this.signedHex = null;
    return this;
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
