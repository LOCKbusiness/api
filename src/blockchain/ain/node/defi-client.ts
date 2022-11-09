import { BigNumber } from '@defichain/jellyfish-api-core';
import { AccountHistory, AccountResult, UTXO as SpendUTXO } from '@defichain/jellyfish-api-core/dist/category/account';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from 'src/shared/services/http.service';
import { NodeClient, NodeCommand, NodeMode } from './node-client';

export class DeFiClient extends NodeClient {
  constructor(http: HttpService, url: string, scheduler: SchedulerRegistry, mode: NodeMode) {
    super(http, url, scheduler, mode);
  }

  // common
  async listHistory(fromBlock: number, toBlock: number): Promise<AccountHistory[]> {
    return this.callNode((c) =>
      c.account.listAccountHistory(undefined, {
        depth: toBlock - fromBlock,
        maxBlockHeight: toBlock,
        no_rewards: true,
        limit: Number.POSITIVE_INFINITY,
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

  async sendUtxo(addressFrom: string, addressTo: string, amount: number): Promise<string> {
    return this.callNode(
      (c) => c.call(NodeCommand.SEND_UTXO, [addressFrom, addressTo, this.roundAmount(amount)], 'number'),
      true,
    );
  }

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
}
