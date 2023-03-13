import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { Util } from 'src/shared/util';
import { EntityManager, IsNull, LessThan, Not } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';

@Injectable()
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor(manager: EntityManager) {
    super(Transaction, manager);
  }

  async getUndecidedTransactions(): Promise<Transaction[]> {
    return this.find({
      where: {
        inBlockchain: false,
        signedHex: Not(IsNull()),
        invalidationReason: IsNull(),
        updated: LessThan(Util.hourBefore(1)),
      },
    });
  }

  async getOpen(): Promise<Transaction[]> {
    return this.find({
      where: { issuerSignature: Not(IsNull()), verifierSignature: IsNull(), invalidationReason: IsNull() },
    });
  }

  async getVerified(): Promise<Transaction[]> {
    return this.find({
      where: {
        issuerSignature: Not(IsNull()),
        verifierSignature: Not(IsNull()),
        signedHex: IsNull(),
        invalidationReason: IsNull(),
      },
    });
  }
}
