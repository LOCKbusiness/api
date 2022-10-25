import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransactionSegWit, Vin, Vout, Witness, Script } from '@defichain/jellyfish-transaction';
import { calculateFeeP2WPKH } from '@defichain/jellyfish-transaction-builder';
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet';
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

@Injectable()
export class JellyfishService {
  private readonly queue: QueueHandler;
  constructor(private readonly utxoProvider: UtxoProviderService, scheduler: SchedulerRegistry) {
    this.queue = new QueueHandler(scheduler, 65000);
  }

  public createWallet(seed: string[]): JellyfishWallet<WhaleWalletAccount, WalletHdNode> {
    return new JellyfishWallet(
      MnemonicHdNodeProvider.fromWords(seed, this.bip32OptionsBasedOn(this.getNetwork())),
      new WhaleWalletAccountProvider(undefined, this.getNetwork()),
      JellyfishWallet.COIN_TYPE_DFI,
      JellyfishWallet.PURPOSE_LIGHT_WALLET,
    );
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

  async rawTxForSendFromLiq(to: string, amount: BigNumber, sizePriority: UtxoSizePriority): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForSend(Config.staking.liquidity.address, to, amount, true, sizePriority));
  }

  async rawTxForSendToLiq(from: string, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForSend(from, Config.staking.liquidity.address, amount, false));
  }

  async rawTxForSplitUtxo(address: string, split: number): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForUtxoManagement(address, split, UtxoSizePriority.BIG));
  }

  async rawTxForMergeUtxos(address: string, merge: number): Promise<RawTxDto> {
    return this.call(() => this.generateRawTxForUtxoManagement(address, merge, UtxoSizePriority.SMALL));
  }

  // --- RAW TX GENERATION --- //

  private async generateRawTxForCreate(masternode: Masternode): Promise<RawTxDto> {
    const network = this.getNetwork();
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner, network);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

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

    const tx = new CTransactionSegWit(RawTxUtil.createTxSegWit(vins, vouts, witnesses));
    return {
      id: tx.txId,
      hex: tx.toHex(),
      scriptHex: utxo.scriptHex,
      prevouts: utxo.prevouts,
    };
  }

  private async generateRawTxForResign(masternode: Masternode): Promise<RawTxDto> {
    const network = this.getNetwork();

    const [, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner, network);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

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

    const tx = new CTransactionSegWit(RawTxUtil.createTxSegWit(vins, vouts, witnesses));
    return {
      id: tx.txId,
      hex: tx.toHex(),
      scriptHex: utxo.scriptHex,
      prevouts: utxo.prevouts,
    };
  }

  private async generateRawTxForSend(
    from: string,
    to: string,
    amount: BigNumber,
    useChangeOutput: boolean,
    sizePriority: UtxoSizePriority = UtxoSizePriority.SMALL,
  ): Promise<RawTxDto> {
    const network = this.getNetwork();

    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from, network);
    const [toScript] = RawTxUtil.parseAddress(to, network);

    const utxo = useChangeOutput
      ? await this.utxoProvider.provideUntilAmount(from, amount, sizePriority)
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
    const network = this.getNetwork();

    const numberOfInputs = sizePriority === UtxoSizePriority.SMALL ? numberOf : 1;
    const numberOfOutputs = sizePriority === UtxoSizePriority.BIG ? numberOf : 1;

    const [script, pubKeyHash] = RawTxUtil.parseAddress(address, network);

    const utxo = await this.utxoProvider.provideNumber(address, numberOfInputs, sizePriority);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts =
      numberOfOutputs > 1
        ? this.calculateSplittedOutputs(utxo.total, numberOfOutputs, script)
        : [RawTxUtil.createVoutReturn(script, utxo.total.div(numberOfOutputs))];
    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(pubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return this.createTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  // --- HELPER METHODS --- //
  private createTxAndCalcFee(utxo: UtxoInformation, vins: Vin[], vouts: Vout[], witnesses: Witness[]): RawTxDto {
    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);
    const fee = calculateFeeP2WPKH(new BigNumber(Config.blockchain.minFeeRate), tx);
    const lastElement = vouts[vouts.length - 1];
    lastElement.value = lastElement.value.minus(fee);

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
    const parts = total.dividedToIntegerBy(numberOfOutputs);
    const numberOfSameSizedOuputs = numberOfOutputs - 1;
    const totalSameSizedOutputs = parts.multipliedBy(numberOfSameSizedOuputs);
    return new Array(numberOfSameSizedOuputs)
      .fill(RawTxUtil.createVoutReturn(script, parts))
      .concat([RawTxUtil.createVoutReturn(script, total.minus(totalSameSizedOutputs))]);
  }

  private call<T>(call: () => Promise<T>): Promise<T> {
    return this.queue.handle(() => call());
  }

  private getNetwork(): Network {
    return Config.network?.toLowerCase() === 'mainnet' ? MainNet : TestNet;
  }
}
