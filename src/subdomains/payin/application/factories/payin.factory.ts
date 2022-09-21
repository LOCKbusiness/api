import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { PayIn } from '../../domain/entities/payin-crypto.entity';
import { PayInTransaction } from '../interfaces';

@Injectable()
export class PayInFactory {
  createFromTransaction(tx: PayInTransaction, asset: Asset): PayIn {
    return PayIn.create(tx.txSource, tx.type, tx.txId, tx.blockHeight, tx.amount, asset);
  }
}
