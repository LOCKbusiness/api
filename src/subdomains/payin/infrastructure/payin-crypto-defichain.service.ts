import { Injectable } from '@nestjs/common';
import { UTXO } from '@defichain/jellyfish-api-core/dist/category/wallet';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account';
import { PayInTransaction } from '../application/interfaces';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { PayInBlockchainAddress } from '../domain/entities/payin-blockchain-address.entity';

interface HistoryAmount {
  amount: number;
  asset: string;
}

@Injectable()
export class PayInDeFiChainService {
  private client: DeFiClient;

  private readonly utxoTxTypes = ['receive', 'AccountToUtxos'];

  constructor(nodeService: NodeService) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.client = client));
  }

  //*** PUBLIC API ***//

  async getNewTransactionsSince(lastHeight: number): Promise<PayInTransaction[]> {
    const histories = await this.getNewTransactionsHistorySince(lastHeight);

    return this.mapHistoriesToTransactions(histories);
  }

  //*** HELPER METHODS ***//

  private async getNewTransactionsHistorySince(lastHeight: number): Promise<AccountHistory[]> {
    const { blocks: currentHeight } = await this.checkNodeInSync();

    const utxos = await this.client.getUtxo();

    return this.getAddressesWithFunds(utxos)
      .then((a) => this.client.getHistories(a, lastHeight + 1, currentHeight))
      .then((i) => i.filter((h) => [...this.utxoTxTypes].includes(h.type)))
      .then((i) => i.filter((h) => h.blockHeight > lastHeight));
  }

  private async checkNodeInSync(): Promise<{ headers: number; blocks: number }> {
    const { blocks, headers } = await this.client.getInfo();

    if (blocks < headers - 1) throw new Error(`Node not in sync by ${headers - blocks} block(s)`);

    return { headers, blocks };
  }

  private async getAddressesWithFunds(utxo: UTXO[]): Promise<string[]> {
    const utxoAddresses = utxo
      .filter((u) => u.amount.toNumber() >= Config.payIn.minPayIn.DeFiChain.DFI)
      .map((u) => u.address);

    return [...new Set(utxoAddresses)];
  }

  private mapHistoriesToTransactions(histories: AccountHistory[]): PayInTransaction[] {
    const transactions: PayInTransaction[] = [];

    histories.forEach((h) => {
      const amounts = this.getHistoryAmounts(h);

      amounts.forEach((a) => {
        transactions.push({
          address: PayInBlockchainAddress.create(h.owner, Blockchain.DEFICHAIN),
          type: h.type,
          txId: h.txid,
          blockHeight: h.blockHeight,
          amount: a.amount,
          asset: a.asset,
        });
      });
    });

    return transactions;
  }

  private getHistoryAmounts(history: AccountHistory): HistoryAmount[] {
    const amounts = history.amounts.map((a) => this.parseAmount(a));

    return amounts.map((a) => ({ ...a, amount: Math.abs(a.amount) }));
  }

  private parseAmount(amount: string): HistoryAmount {
    return { ...this.client.parseAmount(amount) };
  }
}
