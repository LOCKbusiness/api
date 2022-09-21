import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';

export interface PayInTransaction {
  txSource: BlockchainAddress;
  type: string;
  txId: string;
  blockHeight: number;
  amount: number;
  asset: string;
}
