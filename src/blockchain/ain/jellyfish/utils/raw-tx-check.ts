import { CTransactionSegWit, Script, OP_DEFI_TX, Vin, Vout } from '@defichain/jellyfish-transaction';
import { Config } from 'src/config/config';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxUtil } from './raw-tx-util';
import { SmartBuffer } from 'smart-buffer';

export class RawTxCheck {
  static incomingTxTypes = [
    'OP_DEFI_TX_CREATE_MASTER_NODE',
    'OP_DEFI_TX_RESIGN_MASTER_NODE',
    'OP_DEFI_TX_VOTE',
    'OP_DEFI_TX_CREATE_VAULT',
    'OP_DEFI_TX_DEPOSIT_TO_VAULT',
    'OP_DEFI_TX_TAKE_LOAN',
    'OP_DEFI_TX_POOL_ADD_LIQUIDITY',
    'OP_DEFI_TX_PAYBACK_LOAN',
    'OP_DEFI_TX_WITHDRAW_FROM_VAULT',
    'OP_DEFI_TX_POOL_REMOVE_LIQUIDITY',
    'OP_DEFI_TX_COMPOSITE_SWAP',
  ];
  static outgoingTxTypes = ['OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT'];

  static isAllowed(rawTx: RawTxDto, expectedIsIncoming: boolean): boolean {
    const [, vouts] = this.parseInAndOutputs(rawTx.hex);
    if (vouts.length === 0) return false;
    const [isIncoming, defiTxType] = this.isIncomingBasedOn(vouts);

    return (
      expectedIsIncoming === isIncoming &&
      this.isOnCorrectList(defiTxType, isIncoming ? this.incomingTxTypes : this.outgoingTxTypes, isIncoming)
    );
  }

  private static isOnCorrectList(defiTxType: string | undefined, txTypes: string[], isIncoming: boolean): boolean {
    if (!defiTxType) return isIncoming;
    return txTypes.includes(defiTxType);
  }

  static isIncoming(rawTx: RawTxDto): boolean {
    const [vins, vouts] = this.parseInAndOutputs(rawTx.hex);
    if (vins.length === 0 || vouts.length === 0) return false;
    const [isIncoming, defiTxType] = this.isIncomingBasedOn(vouts);
    console.info(
      `# of vins: ${vins.length}, # of vouts: ${vouts.length}, DEFI TX: ${defiTxType} => isIncoming? ${isIncoming}`,
    );
    return isIncoming;
  }

  private static parseInAndOutputs(hex: string): [Vin[], Vout[]] {
    if (!/^[a-f0-9]*$/.test(hex)) return [[], []];
    const tx = new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(hex, 'hex')));
    return [tx.vin, tx.vout];
  }

  private static isIncomingBasedOn(vouts: Vout[]): [boolean, string | undefined] {
    const defiTxType = this.retrieveTxType(vouts[0]);
    const [stakingLiqScript] = RawTxUtil.parseAddress(Config.staking.liquidity.address);
    const [yieldMachineLiqScript] = RawTxUtil.parseAddress(Config.yieldMachine.liquidity.address);
    return [
      (defiTxType && !this.outgoingTxTypes.includes(defiTxType)) ||
        (!defiTxType &&
          vouts.every((v) => this.scriptIsEqual(v, stakingLiqScript) || this.scriptIsEqual(v, yieldMachineLiqScript))),
      defiTxType,
    ];
  }

  private static retrieveTxType(vout: Vout): string | undefined {
    const opDefiTx = vout.script.stack.find((opCode) => (opCode as OP_DEFI_TX)?.type === 'OP_DEFI_TX');
    if (!opDefiTx) return undefined;
    if ('tx' in opDefiTx) {
      return (opDefiTx as OP_DEFI_TX).tx.name;
    }
    return undefined;
  }

  private static scriptIsEqual(vout: Vout, script: Script): boolean {
    if (vout.script.stack.length !== script.stack.length) return false;
    return vout.script.stack.every(
      (code, index) => code.asBuffer().toString() === script.stack[index].asBuffer().toString(),
    );
  }
}
