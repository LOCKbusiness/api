import { TokenBalanceUInt32 } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { RawTxDto } from '../dto/raw-tx.dto';
import { UtxoProviderService } from '../services/utxo-provider.service';
import { RawTxUtil } from './raw-tx-util';

export class RawTxPool {
  static async add(
    from: string,
    tokenA: number,
    amountA: BigNumber,
    tokenB: number,
    amountB: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const tokenBalanceA: TokenBalanceUInt32 = { token: tokenA, amount: amountA };
    const tokenBalanceB: TokenBalanceUInt32 = { token: tokenB, amount: amountB };

    const utxo = await utxoProvider.provideForDefiTx(from);
    return RawTxUtil.generateDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutAddPoolLiquidity(fromScript, [tokenBalanceA, tokenBalanceB]),
    );
  }

  static async remove(
    from: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await utxoProvider.provideForDefiTx(from);
    return RawTxUtil.generateDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutRemovePoolLiquidity(fromScript, token, amount),
    );
  }
}
