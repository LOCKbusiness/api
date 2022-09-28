import { ApiPagedResponse, WhaleApiClient } from '@defichain/whale-api-client';
import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Transaction, TransactionVin } from '@defichain/whale-api-client/dist/api/transactions';
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

  async getUnspent(address: string): Promise<ApiPagedResponse<AddressUnspent>> {
    return this.client.address.listTransactionUnspent(address);
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

  async getTxVins(txId: string): Promise<TransactionVin[]> {
    return await this.client.transactions.getVins(txId);
  }
}
