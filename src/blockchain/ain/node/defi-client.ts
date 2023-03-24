import { BigNumber } from '@defichain/jellyfish-api-core';
import { AccountHistory, AccountResult, UTXO as SpendUTXO } from '@defichain/jellyfish-api-core/dist/category/account';
import { EnsureTxIdOrThrow } from '../decorators/ensure-txid-or-throw.decorator';
import { NodeClient, NodeCommand } from './node-client';

export class DeFiClient extends NodeClient {
  // common
  async listHistory(fromBlock: number, toBlock: number, address?: string): Promise<AccountHistory[]> {
    return this.callNode((c) =>
      c.account.listAccountHistory(address, {
        depth: toBlock - fromBlock,
        maxBlockHeight: toBlock,
        no_rewards: true,
        limit: 1000000,
      }),
    );
  }

  async getBalance(): Promise<BigNumber> {
    return this.callNode((c) => c.wallet.getBalance());
  }

  async getNodeBalance(): Promise<{ utxo: BigNumber; token: number }> {
    return { utxo: await this.getBalance(), token: await this.getToken().then((t) => t.length) };
  }

  // UTXO
  get utxoFee(): number {
    return this.chain === 'testnet' ? 0.00000192 : 0.00000132;
  }

  @EnsureTxIdOrThrow()
  async sendUtxo(addressFrom: string, addressTo: string, amount: number): Promise<string> {
    return this.callNode(
      (c) => c.call(NodeCommand.SEND_UTXO, [addressFrom, addressTo, this.roundAmount(amount)], 'number'),
      true,
    );
  }

  @EnsureTxIdOrThrow()
  async sendCompleteUtxo(addressFrom: string, addressTo: string, amount: number): Promise<string> {
    return this.callNode(
      (c) =>
        c.call(
          NodeCommand.SEND_UTXO,
          [addressFrom, addressTo, this.roundAmount(amount - this.utxoFee), addressTo],
          'number',
        ),
      true,
    );
  }

  @EnsureTxIdOrThrow()
  async toUtxo(addressFrom: string, addressTo: string, amount: number, utxos?: SpendUTXO[]): Promise<string> {
    return this.callNode(
      (c) => c.account.accountToUtxos(addressFrom, { [addressTo]: `${this.roundAmount(amount)}@DFI` }, { utxos }),
      true,
    );
  }

  // token
  async getToken(): Promise<AccountResult<string, string>[]> {
    return this.callNode((c) => c.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: true }));
  }

  async testCompositeSwap(tokenFrom: string, tokenTo: string, amount: number): Promise<number> {
    if (tokenFrom === tokenTo) return amount;

    return this.callNode((c) =>
      c.call(
        NodeCommand.TEST_POOL_SWAP,
        [
          {
            from: undefined,
            tokenFrom: tokenFrom,
            amountFrom: this.roundAmount(amount),
            to: undefined,
            tokenTo: tokenTo,
          },
          'auto',
        ],
        'number',
      ),
    ).then((r: string) => this.parseAmount(r).amount);
  }

  @EnsureTxIdOrThrow()
  async compositeSwap(
    addressFrom: string,
    tokenFrom: string,
    addressTo: string,
    tokenTo: string,
    amount: number,
    utxos?: SpendUTXO[],
    maxPrice?: number,
  ): Promise<string> {
    return this.callNode(
      (c) =>
        c.poolpair.compositeSwap(
          {
            from: addressFrom,
            tokenFrom: tokenFrom,
            amountFrom: this.roundAmount(amount),
            to: addressTo,
            tokenTo: tokenTo,
            maxPrice,
          },
          utxos,
        ),
      true,
    );
  }

  @EnsureTxIdOrThrow()
  async addPoolLiquidity(address: string, assetsPair: [string, string]): Promise<string> {
    return this.callNode((c) => c.poolpair.addPoolLiquidity({ [address]: assetsPair }, address), true);
  }

  @EnsureTxIdOrThrow()
  async sendToken(
    addressFrom: string,
    addressTo: string,
    token: string,
    amount: number,
    utxos: SpendUTXO[] = [],
  ): Promise<string> {
    return token === 'DFI'
      ? this.toUtxo(addressFrom, addressTo, amount, utxos)
      : this.callNode(
          (c) =>
            c.account.accountToAccount(addressFrom, { [addressTo]: `${this.roundAmount(amount)}@${token}` }, { utxos }),
          true,
        );
  }

  @EnsureTxIdOrThrow()
  async sendTokenToMany(
    addressFrom: string,
    token: string,
    payload: { addressTo: string; amount: number }[],
    utxos: SpendUTXO[] = [],
  ): Promise<string> {
    if (payload.length > 10) {
      throw new Error('Too many addresses in one transaction batch, allowed max 10 for tokens');
    }

    const batch = payload.reduce((acc, p) => ({ ...acc, [p.addressTo]: `${p.amount}@${token}` }), {});

    return this.callNode((c) => c.account.accountToAccount(addressFrom, batch, { utxos }), true);
  }

  @EnsureTxIdOrThrow()
  async toToken(address: string, amount: number, utxos?: SpendUTXO[]): Promise<string> {
    return this.callNode(
      (c) => c.account.utxosToAccount({ [address]: `${this.roundAmount(amount)}@DFI` }, utxos),
      true,
    );
  }

  // raw tx
  @EnsureTxIdOrThrow()
  async signAndSend(hex: string): Promise<string> {
    const signedTx = await this.signTx(hex);
    return this.sendRawTx(signedTx.hex);
  }
}
