import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';

export interface PayInTransaction {
  address: BlockchainAddress;
  txType: string;
  txId: string;
  blockHeight: number;
  amount: number;
  asset?: Asset;
  isConfirmed: boolean;
}
