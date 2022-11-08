import BigNumber from 'bignumber.js';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/utxo-provider.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';

export interface WalletBaseData {
  ownerWallet: string;
  accountIndex: number;
}

export interface SendFromLiqData extends WalletBaseData {
  to: string;
  amount: BigNumber;
  sizePriority: UtxoSizePriority;
}

export interface SendToLiqData extends WalletBaseData {
  from: string;
  amount: BigNumber;
}

export interface CreateMasternodeData extends WalletBaseData {
  masternode: Masternode;
}

export interface ResignMasternodeData extends WalletBaseData {
  masternode: Masternode;
}

export interface SendFromLiqToCustomerData {
  to: string;
  amount: BigNumber;
  withdrawalId: number;
}

export interface SplitData {
  address: string;
  split: number;
}

export interface MergeData {
  address: string;
  merge: number;
}

export interface SendTokenData extends WalletBaseData {
  from: string;
  to: string;
  balance: TokenBalance;
}

export interface CreateVaultData extends WalletBaseData {
  owner: string;
}

interface VaultData extends WalletBaseData {
  vault: string;
  token: number;
  amount: BigNumber;
}

export interface DepositToVaultData extends VaultData {
  from: string;
}

export interface WithdrawFromVaultData extends VaultData {
  to: string;
}

export interface TakeLoanData extends VaultData {
  to: string;
}

export interface PaybackLoanData extends VaultData {
  from: string;
}

export interface TokenBalance {
  token: number;
  amount: BigNumber;
}

export interface AddPoolLiquidityData extends WalletBaseData {
  from: string;
  partA: TokenBalance;
  partB: TokenBalance;
}

export interface RemovePoolLiquidityData extends WalletBaseData {
  from: string;
  token: number;
  amount: BigNumber;
}

export interface SwapSource {
  from: string;
  token: number;
  amount: BigNumber;
}

export interface SwapDestination {
  token: number;
}

export interface CompositeSwapData extends WalletBaseData {
  source: SwapSource;
  destination: SwapDestination;
}
