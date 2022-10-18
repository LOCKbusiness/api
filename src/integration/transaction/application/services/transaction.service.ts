import { Injectable, NotFoundException } from '@nestjs/common';
import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { TransactionOutputDto } from '../dto/transaction.output.dto';
import { Transaction } from '../types/transaction';
import { Transaction as TransactionEntity } from '../../domain/entities/transaction.entity';
import { SmartBuffer } from 'smart-buffer';
import { TransactionRepository } from '../repositories/transaction.repository';
import { Config } from 'src/config/config';

@Injectable()
export class TransactionService {
  private readonly transactions: Map<string, Transaction>;

  constructor(private readonly repository: TransactionRepository) {
    this.transactions = new Map<string, Transaction>();
  }

  async getOpen(): Promise<TransactionOutputDto[]> {
    return this.repository.getOpen().then(this.toDto);
  }

  async getVerified(): Promise<TransactionOutputDto[]> {
    return this.repository.getVerified().then(this.toDto);
  }

  async verified(id: string, signature: string) {
    const tx = await this.repository.findOne(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.repository.save(tx.verified(signature));
  }

  async invalidated(id: string, reason?: string) {
    const tx = await this.repository.findOne(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.repository.save(tx.invalidated(reason));

    const txPromise = this.transactions.get(tx.id);
    this.transactions.delete(tx.id);
    txPromise?.invalidated();
  }

  async signed(id: string, hex: string) {
    const tx = await this.repository.findOne(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.repository.save(tx.signed(hex));

    const txPromise = this.transactions.get(tx.id);
    this.transactions.delete(tx.id);
    txPromise?.signed(hex);
  }

  async sign(rawTx: RawTxDto, signature: string, payload?: any): Promise<string> {
    const id = this.receiveIdFor(rawTx);

    const tx = await this.repository.findOne(id);
    if (tx.signedHex) return Promise.resolve(tx.signedHex);

    await this.repository.save(TransactionEntity.create(id, rawTx, payload, signature));

    return new Promise<string>((resolve, reject) => {
      this.transactions.set(tx.id, { signed: resolve, invalidated: reject });

      setTimeout(() => reject('Timeout'), Config.staking.signature.timeout);
    });
  }

  private receiveIdFor(rawTx: RawTxDto): string {
    return new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(rawTx.hex, 'hex'))).txId;
  }

  private toDto(transactions: TransactionEntity[]): TransactionOutputDto[] {
    return transactions.map((t) => {
      return {
        id: t.id,
        issuerSignature: t.issuerSignature,
        verifierSignature: t.verifierSignature,
        rawTx: JSON.parse(t.rawTx) as RawTxDto,
        payload: JSON.parse(t.payload),
      };
    });
  }
}
