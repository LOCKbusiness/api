import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxBase } from './raw-tx-base';
import { RawTxUtil } from './raw-tx-util';

export class RawTxAccount extends RawTxBase {
  async send(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    return this.handle(() => this.createSend(from, to, token, amount, lockUtxo, useFeeExactAmount));
  }

  private async createSend(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useFeeExactAmount
      ? await this.utxoProvider.provideExactAmount(from, useFeeExactAmount, lockUtxo)
      : await this.utxoProvider.provideForDefiTx(from, lockUtxo);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutAnyAccountToAccount(fromScript, toScript, token, amount)];
    if (!useFeeExactAmount) vouts.push(RawTxUtil.createVoutReturn(fromScript, utxo.total));

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return useFeeExactAmount
      ? RawTxUtil.generateTx(utxo, vins, vouts, witnesses)
      : RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  async swap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() => this.createSwap(from, fromToken, fromAmount, toToken, lockUtxo));
  }

  private async createSwap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await this.utxoProvider.provideForDefiTx(from, lockUtxo);
    return RawTxUtil.generateDefiTx(
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

  async toUtxo(
    from: string,
    to: string,
    amount: BigNumber,
    lockUtxo: boolean,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    return this.handle(() => this.createToUtxo(from, to, amount, lockUtxo, useFeeExactAmount));
  }

  private async createToUtxo(
    from: string,
    to: string,
    amount: BigNumber,
    lockUtxo: boolean,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useFeeExactAmount
      ? await this.utxoProvider.provideExactAmount(from, useFeeExactAmount, lockUtxo)
      : await this.utxoProvider.provideForDefiTx(from, lockUtxo);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutAccountToUtxo(fromScript, amount, useFeeExactAmount ? 1 : 2)];
    if (!useFeeExactAmount) vouts.push(RawTxUtil.createVoutReturn(fromScript, utxo.total));
    vouts.push(RawTxUtil.createVoutReturn(toScript, amount));

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return useFeeExactAmount
      ? RawTxUtil.generateTx(utxo, vins, vouts, witnesses)
      : RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses, new BigNumber(0), 1);
  }
}
