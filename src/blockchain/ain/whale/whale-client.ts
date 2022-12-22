import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client';
import { AddressToken, AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { CollateralToken, LoanVaultActive, LoanVaultState } from '@defichain/whale-api-client/dist/api/loan';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { Transaction, TransactionVin } from '@defichain/whale-api-client/dist/api/transactions';
import BigNumber from 'bignumber.js';
import { GetConfig } from 'src/config/config';
import { Util } from 'src/shared/util';

export class WhaleClient {
  private readonly client: WhaleApiClient;

  constructor() {
    this.client = this.createWhaleClient();
  }

  private createWhaleClient(): WhaleApiClient {
    return new WhaleApiClient(GetConfig().whale);
  }

  async getUtxoBalance(address: string): Promise<BigNumber> {
    return this.client.address.getBalance(address).then(BigNumber);
  }

  async getTokenBalances(address: string): Promise<AddressToken[]> {
    return await this.getAll(() => this.client.address.listToken(address));
  }

  async getTokenBalance(address: string, token: string): Promise<BigNumber> {
    return this.getTokenBalances(address)
      .then((tb) => tb.find((b) => b.symbol === token)?.amount ?? 0)
      .then(BigNumber);
  }

  async getBlockHeight(): Promise<number> {
    return (await this.client.stats.get()).count.blocks;
  }

  async getAllUnspent(address: string): Promise<AddressUnspent[]> {
    return await this.getAll(() => this.client.address.listTransactionUnspent(address, 200));
  }

  async getAllTokens(): Promise<TokenData[]> {
    return await this.getAll(() => this.client.tokens.list(200));
  }

  async getAllCollateralTokens(): Promise<CollateralToken[]> {
    return await this.getAll(() => this.client.loan.listCollateralToken(200));
  }

  async getVault(vaultId: string): Promise<LoanVaultActive> {
    const vault = await this.client.loan.getVault(vaultId);
    if (vault.state === LoanVaultState.IN_LIQUIDATION) return undefined;
    return vault;
  }

  async sendRaw(hex: string): Promise<string> {
    return this.client.rawtx.send({ hex });
  }

  async waitForTx(txId: string, timeout = 600000): Promise<string> {
    const tx = await Util.poll(
      () => this.client.transactions.get(txId),
      (t) => t !== undefined,
      5000,
      timeout,
      true,
    );

    if (tx) {
      // wait for Ocean to settle
      await Util.delay(5000);
      return tx.id;
    }

    throw new Error(`Wait for TX ${txId} timed out`);
  }

  async getTx(txId: string): Promise<Transaction> {
    return await this.client.transactions.get(txId);
  }

  async getTxVins(txId: string): Promise<TransactionVin[]> {
    return await this.client.transactions.getVins(txId);
  }

  private async getAll<T>(method: () => Promise<ApiPagedResponse<T>>): Promise<T[]> {
    const batches = [await method()];
    while (batches[batches.length - 1].hasNext) {
      try {
        batches.push(await this.client.paginate(batches[batches.length - 1]));
      } catch (e) {
        break;
      }
    }

    return batches.reduce((prev, curr) => prev.concat(curr), [] as T[]);
  }
}
