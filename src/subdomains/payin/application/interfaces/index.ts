import { BlockchainAddress } from 'src/shared/models/blockchain-address';

export interface PayInTransaction {
  address: BlockchainAddress;
  type: string;
  txId: string;
  blockHeight: number;
  amount: number;
  asset: string;
}
