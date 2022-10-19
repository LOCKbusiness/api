import { EntityRepository, IsNull, LessThan, Not, Repository } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';

@EntityRepository(Transaction)
export class TransactionRepository extends Repository<Transaction> {
  async getUndecidedTransactions(): Promise<Transaction[]> {
    return this.find({
      where: {
        inBlockchain: false,
        invalidationReason: IsNull(),
        updated: LessThan(this.oneHourInPast()),
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

  private oneHourInPast(): string {
    return new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
  }
}
