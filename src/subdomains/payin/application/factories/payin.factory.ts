import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { PayInBlockchainAddress } from '../../domain/entities/payin-blockchain-address.entity';
import { PayIn } from '../../domain/entities/payin.entity';
import { PayInTransaction } from '../interfaces';

@Injectable()
export class PayInFactory {
  createFromTransaction(tx: PayInTransaction, asset: Asset, existingAddress: PayInBlockchainAddress): PayIn {
    return PayIn.create(existingAddress ?? tx.address, tx.type, tx.txId, tx.blockHeight, tx.amount, asset);
  }
}
