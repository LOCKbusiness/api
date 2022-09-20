import { Injectable } from '@nestjs/common';
import { UTXO } from '@defichain/jellyfish-api-core/dist/category/wallet';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account';

@Injectable()
export class PayInCryptoDeFiChainService {
  private client: DeFiClient;

  private readonly utxoTxTypes = ['receive', 'AccountToUtxos'];

  constructor(nodeService: NodeService) {
    nodeService.getConnectedNode<NodeType.INPUT>(NodeType.INPUT).subscribe((client) => (this.client = client));
  }

  //*** PUBLIC API ***//

  async getNewTransactionsSince(lastHeight: number): Promise<AccountHistory[]> {
    const { blocks: currentHeight } = await this.checkNodeInSync();

    const utxos = await this.client.getUtxo();

    return (
      this.getAddressesWithFunds(utxos)
        .then((i) => i.filter((e) => e != Config.blockchain.default.utxoSpenderAddress))
        // get receive history
        .then((a) => this.client.getHistories(a, lastHeight + 1, currentHeight))
        .then((i) => i.filter((h) => [...this.utxoTxTypes].includes(h.type)))
        .then((i) => i.filter((h) => h.blockHeight > lastHeight))
    );
  }

  //*** HELPER METHODS ***//

  private async checkNodeInSync(): Promise<{ headers: number; blocks: number }> {
    const { blocks, headers } = await this.client.getInfo();
    if (blocks < headers - 1) throw new Error(`Node not in sync by ${headers - blocks} block(s)`);

    return { headers, blocks };
  }

  private async getAddressesWithFunds(utxo: UTXO[]): Promise<string[]> {
    const utxoAddresses = utxo
      .filter((u) => u.amount.toNumber() >= Config.blockchain.default.minDeposit.DeFiChain.DFI)
      .map((u) => u.address);

    return [...new Set(utxoAddresses)];
  }
}
