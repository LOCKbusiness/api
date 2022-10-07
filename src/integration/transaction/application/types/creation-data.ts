import BigNumber from 'bignumber.js';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';

export interface MasternodeBaseData {
  ownerWallet: string;
  accountIndex: number;
}

export interface SendFromLiqData extends MasternodeBaseData {
  to: string;
  amount: BigNumber;
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
}
