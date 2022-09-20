import { Blockchain } from '../enums/blockchain.enum';
import { WalletRole } from './wallet-role.enum';

export interface JwtPayload {
  id: number;
  address: string;
  role: WalletRole;
  blockchains: Blockchain[];
}
