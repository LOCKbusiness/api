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

  @Column({ type: 'simple-json', nullable: true })
  payload: string;

  @Column({ type: 'simple-json' })
  rawTx: string;

  @Column()
  issuerSignature: string;

  @Column({ nullable: true })
  verifierSignature: string;

  @Column({ default: true })
  active: boolean;

  @Column({ length: 2048, nullable: true })
  signedHex: string;

  @Column({ default: false })
  broadcasted: boolean;

  @Column({ nullable: true })
  invalidationReason: string;

  static create(id: string, rawTx: RawTxDto, payload: any, issuerSignature: string): Transaction {
    const tx = new Transaction();
    tx.id = id;
    tx.rawTx = JSON.stringify(rawTx);
    tx.issuerSignature = issuerSignature;
    tx.payload = payload && JSON.stringify(payload);
    return tx;
  }

  verified(signature: string): this {
    this.verifierSignature = signature;
    return this;
  }

  signed(hex: string): this {
    this.broadcasted = true;
    this.signedHex = hex;
    return this;
  }

  invalidated(reason?: string): this {
    this.active = false;
    this.invalidationReason = reason;
    return this;
  }
}
