import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { PayIn } from '../../domain/entities/payin.entity';
import { PayInTransaction } from '../interfaces';

@Injectable()
export class PayInFactory {
  createFromTransaction(tx: PayInTransaction, asset: Asset, address: BlockchainAddress): PayIn {
    return PayIn.create(address ?? tx.address, tx.type, tx.txId, tx.blockHeight, tx.amount, asset);
  }
}
