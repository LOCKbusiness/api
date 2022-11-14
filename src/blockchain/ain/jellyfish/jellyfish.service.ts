import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import {
  CTransactionSegWit,
  TransactionSegWit,
  Vin,
  Vout,
  Witness,
  Script,
  TokenBalanceUInt32,
  toOPCodes,
} from '@defichain/jellyfish-transaction';
import { calculateFeeP2WPKH, Prevout } from '@defichain/jellyfish-transaction-builder';
import { JellyfishWallet, WalletAccount, WalletHdNode } from '@defichain/jellyfish-wallet';
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { QueueHandler } from 'src/shared/queue-handler';
import { RawTxDto } from './dto/raw-tx.dto';
import { RawTxUtil } from './raw-tx-util';
import { UtxoInformation, UtxoProviderService, UtxoSizePriority } from './utxo-provider.service';
import { SmartBuffer } from 'smart-buffer';

@Injectable()
export class JellyfishService {
  private readonly queue: QueueHandler;
  constructor(private readonly utxoProvider: UtxoProviderService, scheduler: SchedulerRegistry) {
    this.queue = new QueueHandler(scheduler, 65000);
  }

  public createWallet(seed: string[]): JellyfishWallet<WhaleWalletAccount, WalletHdNode> {
    return new JellyfishWallet(
      MnemonicHdNodeProvider.fromWords(seed, this.bip32OptionsBasedOn(JellyfishService.getNetwork())),
      new WhaleWalletAccountProvider(undefined, JellyfishService.getNetwork()),
      JellyfishWallet.COIN_TYPE_DFI,
      JellyfishWallet.PURPOSE_LIGHT_WALLET,
    );
  }

  public async signRawTx(rawTx: RawTxDto, account: WalletAccount): Promise<string> {
    const prevouts: Vout[] = rawTx.prevouts.map((p) => {
      return {
        // needs to be recreated as those are objects and not just data
        value: new BigNumber(p.value),
        script: {
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(rawTx.scriptHex, 'hex'))),
        },
        tokenId: p.tokenId,
      };
    });
    const tx = new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(rawTx.hex, 'hex')));
    const signedTx = await account.signTx(tx, prevouts);
    return new CTransactionSegWit(signedTx).toHex();
  }

  private bip32OptionsBasedOn(network: Network): Bip32Options {
    return {
      bip32: {
        public: network.bip32.publicPrefix,
        private: network.bip32.privatePrefix,
      },
      wif: network.wifPrefix,
    };
  }

  async rawTxForCreate(masternode: Masternode): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForCreate(masternode));
  }

  async rawTxForResign(masternode: Masternode): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForResign(masternode));
  }

  async rawTxForSendFromTo(from: string, to: string, amount: BigNumber, useFeeBuffer: boolean): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForSend(from, to, amount, true, useFeeBuffer, UtxoSizePriority.SMALL));
  }

  async rawTxForSendFromLiq(to: string, amount: BigNumber, sizePriority: UtxoSizePriority): Promise<RawTxDto> {
    return this.call(() =>
      this.generateRawTxForSend(Config.staking.liquidity.address, to, amount, true, true, sizePriority),
    );
  }

  async rawTxForSendToLiq(from: string, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForSend(from, Config.staking.liquidity.address, amount, false, false));
  }

  async rawTxForSplitUtxo(address: string, split: number): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForUtxoManagement(address, split, UtxoSizePriority.BIG));
  }

  async rawTxForMergeUtxos(address: string, merge: number): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForUtxoManagement(address, merge, UtxoSizePriority.SMALL));
  }

  async unlock(rawTx: RawTxDto): Promise<void> {
    return this.call(() => this.executeUnlockUtxos(rawTx.prevouts, rawTx.scriptHex));
  }

  async rawTxForForwardAccountToLiq(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() =>
      this.generateRawTxForSendAccount(
        from,
        Config.yieldMachine.liquidity.address,
        token,
        amount,
        new BigNumber(Config.payIn.forward.accountToAccountFee),
      ),
    );
  }

  async rawTxForSendAccount(from: string, to: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForSendAccount(from, to, token, amount));
  }

  async rawTxForCreateVault(owner: string): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForCreateVault(owner));
  }

  async rawTxForDepositToVault(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawVaultTx(from, vault, token, amount, RawTxUtil.createVoutDepositToVault));
  }

  async rawTxForWithdrawFromVault(to: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawVaultTx(to, vault, token, amount, RawTxUtil.createVoutWithdrawFromVault));
  }

  async rawTxForTakeLoan(to: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawVaultTx(to, vault, token, amount, RawTxUtil.createVoutTakeLoan));
  }

  async rawTxForPaybackLoan(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawVaultTx(from, vault, token, amount, RawTxUtil.createVoutPaybackLoan));
  }

  async rawTxForAddPoolLiquidity(
    from: string,
    tokenA: number,
    amountA: BigNumber,
    tokenB: number,
    amountB: BigNumber,
  ): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForAddPoolLiquidity(from, tokenA, amountA, tokenB, amountB));
  }

  async rawTxForRemovePoolLiquidity(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForRemovePoolLiquidity(from, token, amount));
  }

  async rawTxForCompositeSwap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
  ): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForCompositeSwap(from, fromToken, fromAmount, toToken));
  }

  // --- RAW TX GENERATION --- //

  private async generateRawTxForCreate(masternode: Masternode): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const utxo = await this.utxoProvider.provideExactAmount(masternode.owner, expectedAmount);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [
      RawTxUtil.createVoutCreateMasternode(operatorPubKeyHash, masternode.timeLock),
      RawTxUtil.createVoutReturn(ownerScript, new BigNumber(Config.masternode.collateral)),
    ];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerPubKeyHash),
      ]),
    ];

    return this.createTx(utxo, vins, vouts, witnesses);
  }

  private async generateRawTxForResign(masternode: Masternode): Promise<RawTxDto> {
    const [, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator);

    const expectedAmount = new BigNumber(Config.masternode.resignFee);
    const utxo = await this.utxoProvider.provideExactAmount(masternode.owner, expectedAmount);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutResignMasternode(masternode.creationHash)];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerPubKeyHash),
      ]),
    ];

    return this.createTx(utxo, vins, vouts, witnesses);
  }

  private async generateRawTxForSend(
    from: string,
    to: string,
    amount: BigNumber,
    useChangeOutput: boolean,
    useFeeBuffer: boolean,
    sizePriority: UtxoSizePriority = UtxoSizePriority.SMALL,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useChangeOutput
      ? await this.utxoProvider.provideUntilAmount(from, amount, sizePriority, useFeeBuffer)
      : await this.utxoProvider.provideExactAmount(from, amount);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutReturn(toScript, amount)];
    if (useChangeOutput) {
      const change = RawTxUtil.createVoutReturn(fromScript, utxo.total?.minus(amount));
      vouts.push(change);
    }
    const fromWitness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(fromWitness);

    return this.createTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private async generateRawTxForUtxoManagement(
    address: string,
    numberOf: number,
    sizePriority: UtxoSizePriority,
  ): Promise<RawTxDto> {
    const numberOfInputs = sizePriority === UtxoSizePriority.SMALL ? numberOf : 1;
    const numberOfOutputs = sizePriority === UtxoSizePriority.BIG ? numberOf : 1;

    const [script, pubKeyHash] = RawTxUtil.parseAddress(address);

    const utxo = await this.utxoProvider.provideNumber(address, numberOfInputs, sizePriority);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts =
      numberOfOutputs > 1
        ? this.calculateSplittedOutputs(utxo.total, numberOfOutputs, script)
        : [RawTxUtil.createVoutReturn(script, utxo.total)];
    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(pubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return this.createTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private async generateRawTxForSendAccount(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useFeeExactAmount
      ? await this.utxoProvider.provideExactAmount(from, useFeeExactAmount)
      : await this.utxoProvider.provideForDefiTx(from);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutAnyAccountToAccount(fromScript, toScript, token, amount)];
    if (!useFeeExactAmount) vouts.push(RawTxUtil.createVoutReturn(fromScript, utxo.total));

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return useFeeExactAmount
      ? this.createTx(utxo, vins, vouts, witnesses)
      : this.createTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private async generateRawTxForCreateVault(owner: string): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(owner);
    const vaultFee = this.vaultFee();

    const utxo = await this.utxoProvider.provideUntilAmount(owner, vaultFee, UtxoSizePriority.FITTING, true);
    return this.generateRawDefiTx(
      ownerScript,
      ownerPubKeyHash,
      utxo,
      RawTxUtil.createVoutCreateVault(ownerScript, vaultFee),
      vaultFee,
    );
  }

  private async generateRawVaultTx(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    createVout: (vault: string, script: Script, token: number, amount: BigNumber) => Vout,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await this.utxoProvider.provideForDefiTx(from);
    return this.generateRawDefiTx(fromScript, fromPubKeyHash, utxo, createVout(vault, fromScript, token, amount));
  }

  private async generateRawTxForAddPoolLiquidity(
    from: string,
    tokenA: number,
    amountA: BigNumber,
    tokenB: number,
    amountB: BigNumber,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const tokenBalanceA: TokenBalanceUInt32 = { token: tokenA, amount: amountA };
    const tokenBalanceB: TokenBalanceUInt32 = { token: tokenB, amount: amountB };

    const utxo = await this.utxoProvider.provideForDefiTx(from);
    return this.generateRawDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutAddPoolLiquidity(fromScript, [tokenBalanceA, tokenBalanceB]),
    );
  }

  private async generateRawTxForRemovePoolLiquidity(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await this.utxoProvider.provideForDefiTx(from);
    return this.generateRawDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutRemovePoolLiquidity(fromScript, token, amount),
    );
  }

  private async generateRawTxForCompositeSwap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await this.utxoProvider.provideForDefiTx(from);
    return this.generateRawDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutCompositeSwap(
        fromScript,
        fromToken,
        fromAmount,
        toToken,
        new BigNumber(Config.blockchain.default.maxPrice),
      ),
    );
  }

  // --- UTXO MANAGEMENT --- //
  private async executeUnlockUtxos(prevouts: Prevout[], scriptHex: string): Promise<void> {
    this.utxoProvider.unlockSpentBasedOn(prevouts, RawTxUtil.parseAddressFromScriptHex(scriptHex));
  }

  // --- HELPER METHODS --- //
  private async generateRawDefiTx(
    fromScript: Script,
    fromPubKeyHash: string,
    utxo: UtxoInformation,
    vout: Vout,
    operationFee = new BigNumber(0),
  ): Promise<RawTxDto> {
    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [vout, RawTxUtil.createVoutReturn(fromScript, utxo.total)];

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return this.createTxAndCalcFee(utxo, vins, vouts, witnesses, operationFee);
  }

  private createTxAndCalcFee(
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

    return this.toDto(tx, utxo);
  }

  private createTx(utxo: UtxoInformation, vins: Vin[], vouts: Vout[], witnesses: Witness[]): RawTxDto {
    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);
    return this.toDto(tx, utxo);
  }

  private toDto(tx: TransactionSegWit, utxo: UtxoInformation): RawTxDto {
    const txObj = new CTransactionSegWit(tx);
    return {
      id: txObj.txId,
      hex: txObj.toHex(),
      scriptHex: utxo.scriptHex,
      prevouts: utxo.prevouts,
    };
  }

  private calculateSplittedOutputs(total: BigNumber, numberOfOutputs: number, script: Script): Vout[] {
    // dividedToIntegerBy does a floor based on description
    const amountPerOutput = total.dividedToIntegerBy(numberOfOutputs);
    const numberOfSameSizedOutputs = numberOfOutputs - 1;
    const totalSameSizedOutputs = amountPerOutput.multipliedBy(numberOfSameSizedOutputs);
    return new Array(numberOfSameSizedOutputs)
      .fill(RawTxUtil.createVoutReturn(script, amountPerOutput))
      .concat([RawTxUtil.createVoutReturn(script, total.minus(totalSameSizedOutputs))]);
  }

  private call<T>(call: () => Promise<T>): Promise<T> {
    return this.queue.handle(() => call());
  }

  private vaultFee(): BigNumber {
    return new BigNumber(JellyfishService.getNetwork() === TestNet ? 1 : 2);
  }

  static getNetwork(): Network {
    return Config.network == 'testnet' ? TestNet : MainNet;
  }
}
