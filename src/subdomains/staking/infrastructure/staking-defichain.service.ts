import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { Withdrawal } from '../domain/entities/withdrawal.entity';

@Injectable()
export class StakingDeFiChainService {
  private inputClient: DeFiClient;
  private liqClient: DeFiClient;

  constructor(nodeService: NodeService) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((client) => (this.liqClient = client));
  }

  //*** PUBLIC API ***//

  async forwardDeposit(sourceAddress: string, amount: number): Promise<string> {
    return this.forwardUtxo(sourceAddress, Config.staking.liquidityWalletAddress, amount);
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    const txId = await this.liqClient.sendUtxoToMany([
      {
        addressTo: withdrawal.staking.withdrawalAddress.address,
        amount: withdrawal.amount + this.liqClient.utxoFee,
      },
    ]);

    await this.liqClient
      .waitForTx(txId)
      .catch((e) => console.error(`Wait for withdrawal prepare transaction failed: ${e}`));

    return txId;
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const transaction = await this.inputClient.getTx(txId);
    const transactionDetails = transaction.details ?? [];

    return transactionDetails.map((d) => d.address);
  }

  async isWithdrawalTxComplete(withdrawalTxId: string): Promise<boolean> {
    const transaction = await this.liqClient.getTx(withdrawalTxId);

    return transaction && transaction.blockhash && transaction.confirmations > 0;
  }

  //*** HELPER METHODS **//

  private async forwardUtxo(sourceAddress: string, targetAddress: string, amount: number): Promise<string> {
    return this.inputClient.sendCompleteUtxo(sourceAddress, targetAddress, amount);
  }
}
