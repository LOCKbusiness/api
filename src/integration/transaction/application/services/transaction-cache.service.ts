import { Injectable } from '@nestjs/common';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { TransactionType } from '../../domain/enums';
import { TransactionCacheRepository } from '../repositories/transaction-cache.repository';

@Injectable()
export class TransactionCacheService {
  constructor(private readonly repository: TransactionCacheRepository) {}

  async get(type: TransactionType, correlationId: string): Promise<RawTxDto | undefined> {
    return this.repository.findOne({ type, correlationId }).then((c) => (c ? JSON.parse(c.rawTx) : undefined));
  }

  async set(type: TransactionType, correlationId: string, rawTx: RawTxDto): Promise<RawTxDto> {
    const existing = await this.repository.findOne({ type, correlationId });
    await this.repository.save({ ...existing, type, correlationId, rawTx: JSON.stringify(rawTx) });
    return rawTx;
  }
}
