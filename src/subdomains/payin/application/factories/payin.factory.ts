import { Injectable } from '@nestjs/common';
import { PayIn } from '../../domain/entities/payin.entity';
import { PayInTransaction } from '../interfaces';

@Injectable()
export class PayInFactory {
  createFromTransaction(tx: PayInTransaction): PayIn {
    return PayIn.create(tx.address, tx.txType, tx.txId, tx.blockHeight, tx.amount, tx.asset, tx.isConfirmed);
  }
}
