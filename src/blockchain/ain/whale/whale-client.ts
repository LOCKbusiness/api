import { WhaleApiClient } from '@defichain/whale-api-client';
import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
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

  async getUTXOBalance(address: string): Promise<BigNumber> {
    return this.client.address.getBalance(address).then(BigNumber);
  }

  async getAllUnspent(address: string): Promise<AddressUnspent[]> {
    return await this.client.address.listTransactionUnspent(address);
  }

  async getUnspent(address: string, expectedAmount: BigNumber): Promise<AddressUnspent[]> {
    const unspent = await this.client.address.listTransactionUnspent(address);

    const wantedUnspent = unspent.find((u) => new BigNumber(u.vout.value).isEqualTo(expectedAmount));

    if (!wantedUnspent) throw new Error(`Unspent on ${address} with amount of ${expectedAmount.toString()} not found`);
    return [wantedUnspent];
  }

  async sendRaw(hex: string): Promise<string> {
    return this.client.rawtx.send({ hex });
  }

  async waitForTx(txId: string, timeout = 1200): Promise<string> {
    const tx = await Util.poll(
      () => this.client.transactions.get(txId),
      (t) => t !== undefined,
      5,
      timeout,
      true,
    );

    if (tx) return tx.id;

    throw new Error(`Wait for TX ${txId} timed out`);
  }

  async getTx(txId: string): Promise<Transaction> {
    return await this.client.transactions.get(txId);
  }

  async getTxVins(txId: string): Promise<TransactionVin[]> {
    return await this.client.transactions.getVins(txId);
  }
}
