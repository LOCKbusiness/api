import { Blockchain } from '../enums/blockchain.enum';
import { WalletRole } from './wallet-role.enum';

export interface JwtPayload {
  walletId: number;
  userId: number;
  address: string;
  role: WalletRole;
  blockchains: Blockchain[];
}
