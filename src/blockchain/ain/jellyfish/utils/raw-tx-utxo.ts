import { Vout, Script } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { UtxoConfig } from '../domain/entities/utxo-config';
import { UtxoSizePriority } from '../domain/enums';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxBase } from './raw-tx-base';
import { RawTxUtil } from './raw-tx-util';

export class RawTxUtxo extends RawTxBase {
  // SEND UTXOS //
  async sendFeeUtxo(from: string, to: string, amount: BigNumber, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() =>
      this.send(from, to, amount, true, lockUtxo, {
        useFeeBuffer: true,
        sizePriority: UtxoSizePriority.SMALL,
        customFeeBuffer: Config.blockchain.minDefiTxFeeBuffer,
      }),
    );
  }

  async sendFeeUtxos(from: string, to: string[], amount: BigNumber, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.sendMany(from, to, amount, lockUtxo));
  }

  async sendWithChange(
    from: string,
    to: string,
    amount: BigNumber,
    sizePriority: UtxoSizePriority,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() => this.send(from, to, amount, true, lockUtxo, { useFeeBuffer: true, sizePriority }));
  }

  async sendAsAccount(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() => this.createSendAsAccount(from, to, token, amount, lockUtxo));
  }

  async forward(from: string, to: string, amount: BigNumber, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() =>
      this.send(from, to, amount, false, lockUtxo, {
        useFeeBuffer: false,
      }),
    );
  }

  private async send(
    from: string,
    to: string,
    amount: BigNumber,
    useChangeOutput: boolean,
    lockUtxo: boolean,
    config: UtxoConfig,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useChangeOutput
      ? await this.utxoProvider.provideUntilAmount(from, amount, lockUtxo, config)
      : await this.utxoProvider.provideExactAmount(from, amount, lockUtxo);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutReturn(toScript, amount)];
    if (useChangeOutput) {
      const change = RawTxUtil.createVoutReturn(fromScript, utxo.total?.minus(amount));
      vouts.push(change);
    }
    const fromWitness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(fromWitness);

    return RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private async sendMany(from: string, to: string[], amount: BigNumber, lockUtxo: boolean): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const neededUtxoAmount = amount.multipliedBy(to.length);
    const utxo = await this.utxoProvider.provideUntilAmount(from, neededUtxoAmount, lockUtxo, {
      sizePriority: UtxoSizePriority.FITTING,
    });

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = to.map((address) => {
      const [toScript] = RawTxUtil.parseAddress(address);
      return RawTxUtil.createVoutReturn(toScript, amount);
    });

    const change = RawTxUtil.createVoutReturn(fromScript, utxo.total?.minus(neededUtxoAmount));
    vouts.push(change);

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private async createSendAsAccount(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    const [, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = await this.utxoProvider.provideExactAmount(from, amount, lockUtxo);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const voutsTemp = [RawTxUtil.createVoutUtxoToAccount(toScript, token, amount)];

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    // special handling for utxos to account
    const tx = RawTxUtil.createTxSegWit(vins, voutsTemp, witnesses);
    const fee = RawTxUtil.calculateFee(tx);
    const vouts = [RawTxUtil.createVoutUtxoToAccount(toScript, token, amount.minus(fee))];

    return RawTxUtil.generateTx(utxo, vins, vouts, witnesses);
  }

  // MANAGE UTXOS //
  async split(address: string, split: number, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.management(address, 1, split, lockUtxo, { sizePriority: UtxoSizePriority.BIG }));
  }

  async merge(address: string, merge: number, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.management(address, merge, 1, lockUtxo, { sizePriority: UtxoSizePriority.SMALL }));
  }

  private async management(
    address: string,
    inputCount: number,
    outputCount: number,
    lockUtxo: boolean,
    config: UtxoConfig,
  ): Promise<RawTxDto> {
    const [script, pubKeyHash] = RawTxUtil.parseAddress(address);

    const utxo = await this.utxoProvider.provideNumber(address, inputCount, lockUtxo, config);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts =
      outputCount > 1
        ? RawTxUtxo.calculateSplittedOutputs(utxo.total, outputCount, script)
        : [RawTxUtil.createVoutReturn(script, utxo.total)];
    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(pubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  private static calculateSplittedOutputs(total: BigNumber, numberOfOutputs: number, script: Script): Vout[] {
    // dividedToIntegerBy does a floor based on description
    const amountPerOutput = total.dividedToIntegerBy(numberOfOutputs);
    const numberOfSameSizedOutputs = numberOfOutputs - 1;
    const totalSameSizedOutputs = amountPerOutput.multipliedBy(numberOfSameSizedOutputs);
    return new Array(numberOfSameSizedOutputs)
      .fill(RawTxUtil.createVoutReturn(script, amountPerOutput))
      .concat([RawTxUtil.createVoutReturn(script, total.minus(totalSameSizedOutputs))]);
  }
}
