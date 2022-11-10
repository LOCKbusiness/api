import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { AccountHistory as JellyAccountHistory } from '@defichain/jellyfish-api-core/dist/category/account';
import { PayInTransaction } from '../application/interfaces';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { PayInBlockchainAddress } from '../domain/entities/payin-blockchain-address.entity';

interface HistoryAmount {
  amount: number;
  asset: string;
}

type AccountHistory = Omit<JellyAccountHistory & HistoryAmount, 'amounts'>;

@Injectable()
export class PayInDeFiChainService {
  private client: DeFiClient;

  private readonly utxoTxTypes = ['receive', 'AccountToUtxos'];
  private readonly tokenTxTypes = [
    'AccountToAccount',
    'AnyAccountsToAccounts',
    'WithdrawFromVault',
    'PoolSwap',
    'RemovePoolLiquidity',
  ];

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
    const { blocks: currentHeight } = await this.client.checkSync();

    return this.client
      .listHistory(lastHeight + 1, currentHeight)
      .then((i) => i.filter((h) => h.blockHeight > lastHeight))
      .then((i) => this.splitHistories(i))
      .then((i) =>
        i.filter(
          (h) =>
            (this.utxoTxTypes.includes(h.type) && this.isDFI(h)) ||
            (this.tokenTxTypes.includes(h.type) && this.isDUSD(h)),
        ),
      )
      .then((i) => i.map((a) => ({ ...a, amount: Math.abs(a.amount) })));
  }

  private splitHistories(histories: JellyAccountHistory[]): AccountHistory[] {
    return histories
      .map((h) => h.amounts.map((a) => ({ ...h, ...this.parseAmount(a) })))
      .reduce((prev, curr) => prev.concat(curr), []);
  }

  private isDFI(history: AccountHistory): boolean {
    return Math.abs(history.amount) >= Config.payIn.min.DeFiChain.DFI;
  }

  private isDUSD(history: AccountHistory): boolean {
    return history.asset === 'DUSD' && history.amount >= Config.payIn.min.DeFiChain.DUSD;
  }

  private mapHistoriesToTransactions(histories: AccountHistory[]): PayInTransaction[] {
    return histories.map((h) => ({
      address: PayInBlockchainAddress.create(h.owner, Blockchain.DEFICHAIN),
      type: h.type,
      txId: h.txid,
      blockHeight: h.blockHeight,
      amount: h.amount,
      asset: h.asset,
    }));
  }

  private parseAmount(amount: string): HistoryAmount {
    return { ...this.client.parseAmount(amount) };
  }
}
