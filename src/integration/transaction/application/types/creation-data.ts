import BigNumber from 'bignumber.js';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/domain/enums';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { AssetType } from 'src/shared/entities/asset.entity';
import { MasternodeVote } from 'src/subdomains/staking/domain/enums';

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

export interface VoteMasternodeData extends WalletBaseData {
  masternode: Masternode;
  proposalId: string;
  voteDecision: MasternodeVote;
}

export interface SendWithdrawalData {
  to: string;
  amount: BigNumber;
  withdrawalId: number;
  type: AssetType;
}

export interface SendCoinWithdrawalData extends SendWithdrawalData {
  type: AssetType.COIN;
}

export interface SendTokenWithdrawalData extends SendWithdrawalData {
  type: AssetType.TOKEN;
  tokenId: number;
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
