import { CTransactionSegWit, Script, OP_DEFI_TX, Vin, Vout } from '@defichain/jellyfish-transaction';
import { Config } from 'src/config/config';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxUtil } from './raw-tx-util';
import { SmartBuffer } from 'smart-buffer';
import { TransactionType } from 'src/integration/transaction/domain/enums';

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
    const [isIncoming, defiTxType] = this.isIncomingBasedOn(vouts);
    console.info(
      `# of vins: ${vins.length}, # of vouts: ${vouts.length}, DEFI TX: ${defiTxType} => isIncoming? ${isIncoming}`,
    );
    return isIncoming;
  }

  private static toDefiTxType(type: TransactionType): string | undefined {
    switch (type) {
      case TransactionType.CREATE_MASTERNODE:
        return 'OP_DEFI_TX_CREATE_MASTER_NODE';
      case TransactionType.RESIGN_MASTERNODE:
        return 'OP_DEFI_TX_RESIGN_MASTER_NODE';
      case TransactionType.VOTE_MASTERNODE:
        return 'OP_DEFI_TX_VOTE';
      case TransactionType.CREATE_VAULT:
        return 'OP_DEFI_TX_CREATE_VAULT';
      case TransactionType.DEPOSIT_TO_VAULT:
        return 'OP_DEFI_TX_DEPOSIT_TO_VAULT';
      case TransactionType.TAKE_LOAN:
        return 'OP_DEFI_TX_TAKE_LOAN';
      case TransactionType.POOL_ADD_LIQUIDITY:
        return 'OP_DEFI_TX_POOL_ADD_LIQUIDITY';
      case TransactionType.PAYBACK_LOAN:
        return 'OP_DEFI_TX_PAYBACK_LOAN';
      case TransactionType.WITHDRAW_FROM_VAULT:
        return 'OP_DEFI_TX_WITHDRAW_FROM_VAULT';
      case TransactionType.POOL_REMOVE_LIQUIDITY:
        return 'OP_DEFI_TX_POOL_REMOVE_LIQUIDITY';
      case TransactionType.ACCOUNT_TO_ACCOUNT:
        return 'OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT';
      case TransactionType.COMPOSITE_SWAP:
        return 'OP_DEFI_TX_COMPOSITE_SWAP';
      case TransactionType.SEND_FROM_LIQ:
      case TransactionType.SEND_TO_LIQ:
      case TransactionType.WITHDRAWAL:
      case TransactionType.UTXO_MERGE:
      case TransactionType.UTXO_SPLIT:
        return undefined;
    }
  }

  private static parseInAndOutputs(hex: string): [Vin[], Vout[]] {
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
