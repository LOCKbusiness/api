import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';

@Injectable()
export class StakingDeFiChainService {
  private client: DeFiClient;

  constructor(nodeService: NodeService) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.client = client));
  }

  //*** PUBLIC API ***//

  async forwardDeposit(sourceAddress: string, amount: number): Promise<string> {
    return this.forwardUtxo(sourceAddress, Config.blockchain.default.stakingWalletAddress, amount);
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const transaction = await this.client.getTx(txId);
    const transactionDetails = transaction.details ?? [];

    return transactionDetails.map((d) => d.address);
  }

  //*** HELPER METHODS **//

  private async forwardUtxo(sourceAddress: string, targetAddress: string, amount: number): Promise<string> {
    return this.client.sendCompleteUtxo(sourceAddress, targetAddress, amount);
  }
}
