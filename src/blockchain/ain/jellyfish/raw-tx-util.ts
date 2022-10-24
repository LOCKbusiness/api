import { Network } from '@defichain/jellyfish-network';
import {
  DeFiTransactionConstants,
  Transaction,
  TransactionSegWit,
  Witness,
  WitnessScript,
  Script,
  OP_CODES,
  Vin,
  Vout,
} from '@defichain/jellyfish-transaction';
import { fromAddress } from '@defichain/jellyfish-address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { MasternodeTimeLock } from 'src/subdomains/staking/domain/enums';

interface OpPushData {
  type: string;
  hex: string;
}

export class RawTxUtil {
  // --- PARSING --- //

  static parseAddress(owner: string, network: Network): [Script, string] {
    const decodedAddress = fromAddress(owner, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[1] as any;
    if (!decodedAddress?.script || !pushData?.hex) throw new Error('Could not parse owner address');
    return [decodedAddress.script, pushData.hex];
  }

  static parseOperatorPubKeyHash(operator: string, network: Network): [Script, string] {
    const decodedAddress = fromAddress(operator, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[2] as any;
    if (!decodedAddress?.script || !pushData?.hex) throw new Error('Could not parse operator address');
    return [decodedAddress.script, pushData.hex];
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

  static createVoutReturn(script: Script, amount: BigNumber): Vout {
    return {
      value: amount,
      script: script,
      tokenId: 0x00,
    };
  }

  static createVoutCreateMasternode(operatorPubKeyHash: string, timeLock: MasternodeTimeLock): Vout {
    return {
      value: new BigNumber(Config.masternode.fee),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE({
            operatorType: 1,
            operatorPubKeyHash: operatorPubKeyHash,
            timelock: timeLock,
          }),
        ],
      },
      tokenId: 0x00,
    };
  }

  static createVoutResignMasternode(creationTxId: string): Vout {
    return {
      value: new BigNumber(0),
      script: {
        stack: [
          OP_CODES.OP_RETURN,
          OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE({
            nodeId: creationTxId,
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

  static createWitnessScript(pubKeyHash: string): WitnessScript {
    return { hex: pubKeyHash };
  }

  // --- TX CREATION --- //

  static createTx(vins: Vin[], vouts: Vout[]): Transaction {
    return {
      version: DeFiTransactionConstants.Version,
      vin: vins,
      vout: vouts,
      lockTime: 0x00000000,
    };
  }

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
