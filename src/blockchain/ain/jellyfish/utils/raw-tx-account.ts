import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { RawTxDto } from '../dto/raw-tx.dto';
import { UtxoProviderService } from '../services/utxo-provider.service';
import { RawTxUtil } from './raw-tx-util';

export class RawTxAccount {
  static async sendFromTo(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxAccount.send(from, to, token, amount, utxoProvider);
  }

  static async sendToLiq(
    from: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxAccount.send(
      from,
      Config.yieldMachine.liquidity.address,
      token,
      amount,
      utxoProvider,
      new BigNumber(Config.payIn.forward.accountToAccountFee),
    );
  }

  private static async send(
    from: string,
    to: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
    useFeeExactAmount?: BigNumber,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [toScript] = RawTxUtil.parseAddress(to);

    const utxo = useFeeExactAmount
      ? await utxoProvider.provideExactAmount(from, useFeeExactAmount)
      : await utxoProvider.provideForDefiTx(from);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutAnyAccountToAccount(fromScript, toScript, token, amount)];
    if (!useFeeExactAmount) vouts.push(RawTxUtil.createVoutReturn(fromScript, utxo.total));

    const witness = RawTxUtil.createWitness([RawTxUtil.createWitnessScript(fromPubKeyHash)]);
    const witnesses = new Array(vins.length).fill(witness);

    return useFeeExactAmount
      ? RawTxUtil.generateTx(utxo, vins, vouts, witnesses)
      : RawTxUtil.generateTxAndCalcFee(utxo, vins, vouts, witnesses);
  }

  static async swap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await utxoProvider.provideForDefiTx(from);
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
}
