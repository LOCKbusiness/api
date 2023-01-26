import {
  DeFiTransactionConstants,
  TransactionSegWit,
  CTransactionSegWit,
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
import { Prevout, calculateFeeP2WPKH } from '@defichain/jellyfish-transaction-builder';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { MasternodeTimeLock, MasternodeVote } from 'src/subdomains/staking/domain/enums';
import { DefiTxHelper } from './defi-tx-helper';
import { JellyfishService } from '../services/jellyfish.service';
import { UtxoInformation } from '../domain/entities/utxo-information';
import { RawTxDto } from '../dto/raw-tx.dto';

interface OpPushData {
  type: string;
  hex: string;
}

export class RawTxUtil {
  // --- PARSING --- //

  static parseAddress(address: string): [Script, string] {
    return this.parseScriptAndHex(address, 1);
  }

  static parseLegacyAddress(legacy: string): [Script, string] {
    return this.parseScriptAndHex(legacy, 2);
  }

  private static parseScriptAndHex(address: string, pushDataIndex: number): [Script, string] {
    const network = JellyfishService.getNetwork();
    const decodedAddress = fromAddress(address, network.name);
    const pushData: OpPushData = decodedAddress?.script.stack[pushDataIndex] as any;
    if (!decodedAddress?.script || !pushData?.hex) throw new Error(`Could not parse ${address}`);
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
    return RawTxUtil.createDefiTxVout(
      DefiTxHelper.createMasternode(1, operatorPubKeyHash, timeLock),
      new BigNumber(Config.masternode.fee),
    );
  }

  static createVoutResignMasternode(creationTxId: string): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.resignMasternode(creationTxId));
  }

  static createVoutVoteMasternode(creationTxId: string, proposalId: string, voteDecision: MasternodeVote): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.voteMasternode(creationTxId, proposalId, voteDecision));
  }

  // --- TOKEN VOUTS --- //

  static createVoutAnyAccountToAccount(from: Script, to: Script, token: number, amount: BigNumber): Vout {
    const balances: TokenBalanceUInt32[] = [
      {
        token,
        amount,
      },
    ];
    return RawTxUtil.createDefiTxVout(DefiTxHelper.anyAccountToAccount(from, to, balances));
  }

  // --- VAULT VOUTS --- //

  static createVoutCreateVault(owner: Script, vaultFee: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.createVault(owner), vaultFee);
  }

  static createVoutDepositToVault(vault: string, from: Script, token: number, amount: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.depositToVault(vault, from, { token, amount }));
  }

  static createVoutWithdrawFromVault(vault: string, to: Script, token: number, amount: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.withdrawFromVault(vault, to, { token, amount }));
  }

  static createVoutTakeLoan(vault: string, to: Script, token: number, amount: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.takeLoan(vault, to, [{ token, amount }]));
  }

  static createVoutPaybackLoan(vault: string, from: Script, token: number, amount: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.paybackLoan(vault, from, [{ token, amount }]));
  }

  // --- POOL VOUTS --- //

  static createVoutAddPoolLiquidity(from: Script, balances: TokenBalanceUInt32[]): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.addPoolLiquidity([{ script: from, balances }], from));
  }

  static createVoutRemovePoolLiquidity(from: Script, token: number, amount: BigNumber): Vout {
    return RawTxUtil.createDefiTxVout(DefiTxHelper.removePoolLiquidity(from, token, amount));
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
    return RawTxUtil.createDefiTxVout(DefiTxHelper.compositeSwap(poolSwap, []));
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

  static generateTx(utxo: UtxoInformation, vins: Vin[], vouts: Vout[], witnesses: Witness[]): RawTxDto {
    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);
    return RawTxUtil.toDto(tx, utxo);
  }

  static generateTxAndCalcFee(
    utxo: UtxoInformation,
    vins: Vin[],
    vouts: Vout[],
    witnesses: Witness[],
    operationFee = new BigNumber(0),
  ): RawTxDto {
    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);
    const fee = calculateFeeP2WPKH(new BigNumber(Config.blockchain.minFeeRate), tx);
    const lastElement = vouts[vouts.length - 1];
    lastElement.value = lastElement.value.minus(fee).minus(operationFee);

    return RawTxUtil.toDto(tx, utxo);
  }

  static generateDefiTx(
    fromScript: Script,
    fromPubKeyHash: string,
    utxo: UtxoInformation,
    vout: Vout,
    operationFee = new BigNumber(0),
  ): RawTxDto {
    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [vout, RawTxUtil.createVoutReturn(fromScript, utxo.total)];

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses, operationFee);
  }

  private static toDto(tx: TransactionSegWit, utxo: UtxoInformation): RawTxDto {
    const txObj = new CTransactionSegWit(tx);
    return {
      id: txObj.txId,
      hex: txObj.toHex(),
      scriptHex: utxo.scriptHex,
      prevouts: utxo.prevouts,
    };
  }
}
