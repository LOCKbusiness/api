import { Network } from '@defichain/jellyfish-network';
import {
  DeFiTransactionConstants,
  Transaction,
  TransactionSegWit,
  Witness,
  WitnessScript,
  Script,
  OP_CODES,
  OP_DEFI_TX,
  Vin,
  Vout,
  TokenBalanceUInt32,
  PoolSwap,
} from '@defichain/jellyfish-transaction';
import { fromAddress, fromScriptHex } from '@defichain/jellyfish-address';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { MasternodeTimeLock } from 'src/subdomains/staking/domain/enums';
import { DefiTxHelper } from './defi-tx-helper';
import { JellyfishService } from './jellyfish.service';

interface OpPushData {
  type: string;
  hex: string;
}

export class RawTxUtil {
  // --- PARSING --- //

  static parseAddress(owner: string): [Script, string] {
    const network = JellyfishService.getNetwork();
    const decodedAddress = fromAddress(owner, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[1] as any;
    if (!decodedAddress?.script || !pushData?.hex) throw new Error('Could not parse owner address');
    return [decodedAddress.script, pushData.hex];
  }

  static parseOperatorPubKeyHash(operator: string): [Script, string] {
    const network = JellyfishService.getNetwork();
    const decodedAddress = fromAddress(operator, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[2] as any;
    if (!decodedAddress?.script || !pushData?.hex) throw new Error('Could not parse operator address');
    return [decodedAddress.script, pushData.hex];
  }

  static parseAddressFromScriptHex(scriptHex: string): string {
    const network = JellyfishService.getNetwork();
    const decodedAddress = fromScriptHex(scriptHex, network.name);
    if (!decodedAddress?.address) throw new Error('Could not parse address of scriptHex');
    return decodedAddress.address;
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

  // --- MASTERNODE VOUTS --- //

  static createVoutCreateMasternode(operatorPubKeyHash: string, timeLock: MasternodeTimeLock): Vout {
    return this.createDefiTxVout(
      DefiTxHelper.createMasternode(1, operatorPubKeyHash, timeLock),
      new BigNumber(Config.masternode.fee),
    );
  }

  static createVoutResignMasternode(creationTxId: string): Vout {
    return this.createDefiTxVout(DefiTxHelper.resignMasternode(creationTxId));
  }

  // --- TOKEN VOUTS --- //

  static createVoutAnyAccountToAccount(from: Script, to: Script, token: number, amount: BigNumber): Vout {
    const balances: TokenBalanceUInt32[] = [
      {
        token,
        amount,
      },
    ];
    return this.createDefiTxVout(DefiTxHelper.anyAccountToAccount(from, to, balances));
  }

  // --- VAULT VOUTS --- //

  static createVoutCreateVault(owner: Script): Vout {
    return this.createDefiTxVout(DefiTxHelper.createVault(owner), new BigNumber(Config.vault.fee));
  }

  static createVoutDepositToVault(vault: string, from: Script, token: number, amount: BigNumber): Vout {
    return this.createDefiTxVout(DefiTxHelper.depositToVault(vault, from, { token, amount }));
  }

  static createVoutWithdrawFromVault(vault: string, to: Script, token: number, amount: BigNumber): Vout {
    return this.createDefiTxVout(DefiTxHelper.withdrawFromVault(vault, to, { token, amount }));
  }

  static createVoutTakeLoan(vault: string, to: Script, token: number, amount: BigNumber): Vout {
    return this.createDefiTxVout(DefiTxHelper.takeLoan(vault, to, [{ token, amount }]));
  }

  static createVoutPaybackLoan(vault: string, from: Script, token: number, amount: BigNumber): Vout {
    return this.createDefiTxVout(DefiTxHelper.paybackLoan(vault, from, [{ token, amount }]));
  }

  // --- POOL VOUTS --- //

  static createVoutAddPoolLiquidity(from: Script, balances: TokenBalanceUInt32[]): Vout {
    return this.createDefiTxVout(DefiTxHelper.addPoolLiquidity([{ script: from, balances }], from));
  }

  static createVoutRemovePoolLiquidity(from: Script, token: number, amount: BigNumber): Vout {
    return this.createDefiTxVout(DefiTxHelper.removePoolLiquidity(from, token, amount));
  }

  // --- SWAP VOUTS --- //

  static createVoutCompositeSwap(
    script: Script,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
    maxPrice: BigNumber,
  ): Vout {
    const poolSwap: PoolSwap = {
      fromScript: script,
      fromTokenId: fromToken,
      fromAmount,
      toScript: script,
      toTokenId: toToken,
      maxPrice,
    };
    return this.createDefiTxVout(DefiTxHelper.compositeSwap(poolSwap, []));
  }

  // --- VOUTS HELPER --- //
  private static createDefiTxVout(tx: OP_DEFI_TX, value = new BigNumber(0)): Vout {
    return {
      value,
      script: { stack: [OP_CODES.OP_RETURN, tx] },
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
