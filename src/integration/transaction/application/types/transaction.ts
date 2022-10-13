import { TransactionDto } from '../dto/transaction.dto';

export type Transaction = TransactionDto & {
  signed: (hex: string) => void;
  invalidated: () => void;
};
