import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';

export interface UtxoInformation {
  prevouts: Prevout[];
  scriptHex: string;
  total: BigNumber;
}
