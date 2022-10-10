import { Prevout } from '@defichain/jellyfish-transaction-builder';

export class RawTxDto {
  hex: string;
  prevouts: Prevout[];
  scriptHex?: string;
}
