import { Prevout } from '@defichain/jellyfish-transaction-builder';

export class RawTxDto {
  id: string;
  hex: string;
  prevouts: Prevout[];
  scriptHex: string;
  isInternal: boolean;
}
