import { Network } from '@defichain/jellyfish-network';
import {
  DeFiTransactionConstants,
  TransactionSegWit,
  Witness,
  WitnessScript,
  Script,
  OP_CODES,
  toOPCodes,
  Vin,
  Vout,
} from '@defichain/jellyfish-transaction';
import { fromAddress } from '@defichain/jellyfish-address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { SmartBuffer } from 'smart-buffer';
import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';

interface OpPushData {
  type: string;
  hex: string;
}

export class RawTxUtil {
  // --- PARSING --- //

  static parseOwnerAddress(owner: string, network: Network): [Script, string] {
    const decodedAddress = fromAddress(owner, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[1] as any;
    if (!decodedAddress.script || !pushData.hex) throw new Error('Could not parse owner address');
    return [decodedAddress.script, pushData.hex];
  }

  static parseOperatorPubKeyHash(operator: string, network: Network): [Script, string] {
    const decodedAddress = fromAddress(operator, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[2] as any;
    if (!decodedAddress.script || !pushData.hex) throw new Error('Could not parse operator address');
    return [decodedAddress?.script, pushData?.hex];
  }

  static parseUnspent(unspent: AddressUnspent[]): [Prevout[], string] {
    let rawScriptHex = '';
    const prevouts = unspent.map((item): Prevout => {
      rawScriptHex = item.script.hex;
      return {
        txid: item.vout.txid,
        vout: item.vout.n,
        value: new BigNumber(item.vout.value),
        script: {
          // TODO(fuxingloh): needs to refactor once jellyfish refactor this.
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(item.script.hex, 'hex'))),
        },
        tokenId: item.vout.tokenId ?? 0x00,
      };
    });
    return [prevouts, rawScriptHex];
  }

  // --- VIN CREATION --- //

  static createVins(prevouts: Prevout[]): Vin[] {
    return prevouts.map((prevout: Prevout): Vin => {
      return {
        txid: prevout.txid,
        index: prevout.vout,
        script: { stack: [] },
        sequence: 0xffffffff,
      };
    });
  }

  // --- VOUT CREATION --- //

  static createVoutReturn(script: Script): Vout {
    return {
      value: new BigNumber(20000),
      script: script,
      tokenId: 0x00,
    };
  }

  static createVoutMasternode(operatorPubKeyHash: string, timeLock: number): Vout {
    return {
      value: new BigNumber(10),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE({
            operatorType: 1,
            operatorPubKeyHash: operatorPubKeyHash,
            timelock: timeLock != null ? timeLock : 0, // TODO (Krysh) should be enum, at least it is not allowed to send null here
          }),
        ],
      },
      tokenId: 0x00,
    };
  }

  // --- WITNESS SCRIPT CREATION --- //

  static createWitness(scripts: WitnessScript[]): Witness {
    return {
      scripts,
    };
  }

  static createWitnessScript(script: Script, pubKeyHash: string): WitnessScript {
    return { ...script, hex: pubKeyHash };
  }

  // --- TX CREATION --- //

  static createTxSegWit(vins: Vin[], vouts: Vout[], witnesses: Witness[]): TransactionSegWit {
    return {
      version: DeFiTransactionConstants.Version,
      marker: DeFiTransactionConstants.WitnessMarker,
      flag: DeFiTransactionConstants.WitnessFlag,
      vin: vins,
      vout: vouts,
      witness: witnesses,
      lockTime: 0x00000000,
    };
  }
}
