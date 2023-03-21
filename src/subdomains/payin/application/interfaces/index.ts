import { Asset } from 'src/shared/entities/asset.entity';
import { BlockchainAddress } from 'src/shared/entities/blockchain-address';

export interface PayInTransaction {
  address: BlockchainAddress;
  txType: string;
  txId: string;
  txSequence: number;
  blockHeight: number;
  amount: number;
  asset?: Asset;
  isConfirmed: boolean;
}
