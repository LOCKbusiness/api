import { Util } from 'src/shared/util';
import { EntityRepository, IsNull, LessThan, Not, Repository } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';

@EntityRepository(Transaction)
export class TransactionRepository extends Repository<Transaction> {
  async getUndecidedTransactions(): Promise<Transaction[]> {
    return this.find({
      where: {
        inBlockchain: false,
        signedHex: Not(IsNull()),
        invalidationReason: IsNull(),
        updated: LessThan(Util.hourBefore(1).toISOString()),
      },
    });
  }

  async getOpen(): Promise<Transaction[]> {
    return this.find({ where: { issuerSignature: Not(IsNull()), verifierSignature: IsNull() } });
  }

  async getVerified(): Promise<Transaction[]> {
    return this.find({
      where: { issuerSignature: Not(IsNull()), verifierSignature: Not(IsNull()), signedHex: IsNull() },
    });
  }
}
