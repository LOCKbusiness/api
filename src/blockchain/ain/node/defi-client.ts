import { AccountHistory, UTXO as SpendUTXO } from '@defichain/jellyfish-api-core/dist/category/account';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from 'src/shared/services/http.service';
import { NodeClient, NodeCommand, NodeMode } from './node-client';

export class DeFiClient extends NodeClient {
  constructor(http: HttpService, url: string, scheduler: SchedulerRegistry, mode: NodeMode) {
    super(http, url, scheduler, mode);
  }

  // common
  async getHistories(addresses: string[], fromBlock: number, toBlock: number): Promise<AccountHistory[]> {
    let results = [];
    for (const address of addresses) {
      results = results.concat(await this.getHistory(address, fromBlock, toBlock));
    }
    return results;
  }

  private async getHistory(address: string, fromBlock: number, toBlock: number): Promise<AccountHistory[]> {
    return this.callNode((c) =>
      c.account.listAccountHistory(address, {
        depth: toBlock - fromBlock,
        maxBlockHeight: toBlock,
      }),
    );
  }

  // UTXO
  get utxoFee(): number {
    return this.chain === 'mainnet' ? 0.00000132 : 0.00000192;
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
}
