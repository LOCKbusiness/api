import BigNumber from 'bignumber.js';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/utxo-provider.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';

export interface MasternodeBaseData {
  ownerWallet: string;
  accountIndex: number;
}

export interface SendFromLiqData extends MasternodeBaseData {
  to: string;
  amount: BigNumber;
  sizePriority: UtxoSizePriority;
}

export interface SendToLiqData extends MasternodeBaseData {
  from: string;
  amount: BigNumber;
}

export interface CreateMasternodeData extends MasternodeBaseData {
  masternode: Masternode;
}

export interface ResignMasternodeData extends MasternodeBaseData {
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

export interface SendTokenData {
  from: string;
  to: string;
  token: number;
  amount: BigNumber;
}

export interface CreateVaultData {
  owner: string;
  accountIndex: number;
}

interface VaultData {
  vault: string;
  token: number;
  amount: BigNumber;
  accountIndex: number;
}

export interface DepositToVaultData extends VaultData {
  from: string;
}
