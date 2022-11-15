import { Vout, Script } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { UtxoSizePriority } from '../domain/enums';
import { RawTxDto } from '../dto/raw-tx.dto';
import { UtxoProviderService } from '../services/utxo-provider.service';
import { RawTxUtil } from './raw-tx-util';

export class RawTxUtxo {
  // SEND UTXOS //
  static async sendFromTo(
    from: string,
    to: string,
    amount: BigNumber,
    useFeeBuffer: boolean,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxUtxo.send(from, to, amount, true, useFeeBuffer, UtxoSizePriority.SMALL, utxoProvider);
  }

  static async sendFromLiq(
    to: string,
    amount: BigNumber,
    sizePriority: UtxoSizePriority,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxUtxo.send(Config.staking.liquidity.address, to, amount, true, true, sizePriority, utxoProvider);
  }

  static async sendToLiq(from: string, amount: BigNumber, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    return RawTxUtxo.send(
      from,
      Config.staking.liquidity.address,
      amount,
      false,
      false,
      UtxoSizePriority.SMALL,
      utxoProvider,
    );
  }

  private static async send(
    from: string,
    to: string,
    amount: BigNumber,
    useChangeOutput: boolean,
    useFeeBuffer: boolean,
    sizePriority: UtxoSizePriority,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useChangeOutput
      ? await utxoProvider.provideUntilAmount(from, amount, sizePriority, useFeeBuffer)
      : await utxoProvider.provideExactAmount(from, amount);

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

  // MANAGE UTXOS //
  static async split(address: string, split: number, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    return RawTxUtxo.management(address, split, UtxoSizePriority.BIG, utxoProvider);
  }

  static async merge(address: string, merge: number, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    return RawTxUtxo.management(address, merge, UtxoSizePriority.SMALL, utxoProvider);
  }

  private static async management(
    address: string,
    numberOf: number,
    sizePriority: UtxoSizePriority,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const numberOfInputs = sizePriority === UtxoSizePriority.SMALL ? numberOf : 1;
    const numberOfOutputs = sizePriority === UtxoSizePriority.BIG ? numberOf : 1;

    const [script, pubKeyHash] = RawTxUtil.parseAddress(address);

    const utxo = await utxoProvider.provideNumber(address, numberOfInputs, sizePriority);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts =
      numberOfOutputs > 1
        ? RawTxUtxo.calculateSplittedOutputs(utxo.total, numberOfOutputs, script)
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
