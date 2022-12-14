import { TokenBalanceUInt32 } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxBase } from './raw-tx-base';
import { RawTxUtil } from './raw-tx-util';

export class RawTxPool extends RawTxBase {
  async add(from: string, tokenA: number, amountA: BigNumber, tokenB: number, amountB: BigNumber): Promise<RawTxDto> {
    return this.handle(() => this.createAdd(from, tokenA, amountA, tokenB, amountB));
  }

  async remove(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.handle(() => this.createRemove(from, token, amount));
  }

  private async createAdd(
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
    return RawTxUtil.generateDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutAddPoolLiquidity(fromScript, [tokenBalanceA, tokenBalanceB]),
    );
  }

  private async createRemove(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await this.utxoProvider.provideForDefiTx(from);
    return RawTxUtil.generateDefiTx(
      fromScript,
      fromPubKeyHash,
      utxo,
      RawTxUtil.createVoutRemovePoolLiquidity(fromScript, token, amount),
    );
  }
}
