import { EntityRepository, IsNull, Not, Repository } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';

@EntityRepository(Transaction)
export class TransactionRepository extends Repository<Transaction> {
  async getActive(): Promise<Transaction[]> {
    return this.find({ where: { active: true } });
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
