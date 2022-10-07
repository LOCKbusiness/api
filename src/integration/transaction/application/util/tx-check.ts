import { isEmpty } from 'class-validator';
import { TransactionDto } from '../dto/transaction.dto';

export class TxCheck {
  static isOpen(tx: TransactionDto): boolean {
    return this.isValid(tx) && isEmpty(tx.verifierSignature);
  }

  static isVerified(tx: TransactionDto): boolean {
    return this.isValid(tx) && !isEmpty(tx.verifierSignature);
  }

  private static isValid(tx: TransactionDto): boolean {
    return !isEmpty(tx.id) && !isEmpty(tx.issuerSignature) && tx.rawTx != null;
  }
}
