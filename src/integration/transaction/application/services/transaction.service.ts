import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { TransactionOutputDto } from '../dto/transaction.output.dto';
import { Transaction as TransactionEntity } from '../../domain/entities/transaction.entity';
import { SmartBuffer } from 'smart-buffer';
import { TransactionRepository } from '../repositories/transaction.repository';
import { Config, Process } from 'src/config/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { AsyncMap } from 'src/shared/async-map';

@Injectable()
export class TransactionService {
  private readonly transactions = new AsyncMap<string, string>();

  private client: WhaleClient;

  constructor(private readonly repository: TransactionRepository, whaleService: WhaleService) {
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async doTransactionChecks() {
    if (Config.processDisabled(Process.TRANSACTION)) return;

    try {
      const txs = await this.repository.getUndecidedTransactions();
      for (const tx of txs) {
        try {
          await this.client.getTx(tx.chainId);
          await this.repository.save(tx.foundOnBlockchain());
        } catch {
          await this.repository.save(tx.notFoundOnBlockchain());
        }
      }
    } catch (e) {
      console.error('Exception during transaction check:', e);
    }
  }

  async getOpen(): Promise<TransactionOutputDto[]> {
    return this.repository.getOpen().then(this.toDto);
  }

  async getVerified(): Promise<TransactionOutputDto[]> {
    return this.repository.getVerified().then(this.toDto);
  }

  async verified(id: string, signature: string) {
    const tx = await this.repository.findOne({ chainId: id });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.isVerified) return;

    console.info(`${tx.chainId} verified`);
    await this.repository.save(tx.verified(signature));
  }

  async invalidated(id: string, reason?: string) {
    const tx = await this.repository.findOne({ chainId: id });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.isInvalidated) return;

    console.info(`${tx.chainId} invalidated with reason: ${reason}`);
    await this.repository.save(tx.invalidated(reason));

    this.transactions.reject(tx.chainId, `${tx.chainId} ${reason}`);
  }

  async signed(id: string, hex: string) {
    const tx = await this.repository.findOne({ chainId: id });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.isInvalidated) throw new BadRequestException('Transaction is invalidated');
    if (tx.isSigned) return;

    console.info(`${tx.chainId} signed`);
    await this.repository.save(tx.signed(hex));

    this.transactions.resolve(tx.chainId, hex);
  }

  async sign(rawTx: RawTxDto, signature: string, payload?: any): Promise<string> {
    const id = rawTx.id ?? this.receiveIdFor(rawTx);
    const existingTx = await this.repository.findOne({ chainId: id });
    if (existingTx && existingTx.signedHex) return Promise.resolve(existingTx.signedHex);

    const newTx = TransactionEntity.create(id, rawTx, payload, signature);
    const tx = existingTx ? Object.assign(existingTx, newTx) : newTx;
    await this.repository.save(tx);
    console.info(`Added ${id} for signing`);

    return this.transactions.wait(id, Config.staking.timeout.signature);
  }

  private receiveIdFor(rawTx: RawTxDto): string {
    return new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(rawTx.hex, 'hex'))).txId;
  }

  private toDto(transactions: TransactionEntity[]): TransactionOutputDto[] {
    return transactions.map((t) => {
      return {
        id: t.chainId,
        issuerSignature: t.issuerSignature,
        verifierSignature: t.verifierSignature,
        rawTx: JSON.parse(t.rawTx) as RawTxDto,
        payload: JSON.parse(t.payload),
      };
    });
  }
}
