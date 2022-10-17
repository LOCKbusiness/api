import { Injectable, NotFoundException } from '@nestjs/common';
import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { TransactionDto } from '../dto/transaction.dto';
import { Transaction } from '../types/transaction';
import { TxCheck } from '../util/tx-check';
import { SmartBuffer } from 'smart-buffer';

@Injectable()
export class TransactionService {
  private readonly transactions: Map<string, Transaction>;

  constructor() {
    this.transactions = new Map<string, Transaction>();
  }

  getOpen(): TransactionDto[] {
    return this.select((tx: TransactionDto) => TxCheck.isOpen(tx));
  }

  getVerified(): TransactionDto[] {
    return this.select((tx: TransactionDto) => TxCheck.isVerified(tx));
  }

  verified(id: string, signature: string) {
    const tx = this.transactions.get(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    tx.verifierSignature = signature;
  }

  invalidated(id: string, reason?: string) {
    const tx = this.transactions.get(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    console.warn(`Invalidated ${id} with reason: ${reason}`);
    this.transactions.delete(tx.id);
    tx.invalidated();
  }

  signed(id: string, hex: string) {
    const tx = this.transactions.get(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    this.transactions.delete(tx.id);
    tx.signed(hex);
  }

  async sign(rawTx: RawTxDto, signature: string, payload?: any): Promise<string> {
    const dto: TransactionDto = {
      id: this.receiveIdFor(rawTx),
      issuerSignature: signature,
      rawTx,
      payload,
    };

    return new Promise((resolve, reject) => {
      this.transactions.set(dto.id, { ...dto, signed: resolve, invalidated: reject });
    });
  }

  private receiveIdFor(rawTx: RawTxDto): string {
    return new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(rawTx.hex, 'hex'))).txId;
  }

  private select(filter: (tx: TransactionDto) => boolean): TransactionDto[] {
    return Array.from(this.transactions.values()).filter(filter);
  }
}
