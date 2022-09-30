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
    const txId = await this.liqClient.sendUtxo(
      Config.staking.liquidityWalletAddress,
      withdrawal.staking.withdrawalAddress.address,
      withdrawal.amount,
    );

    await this.liqClient
      .waitForTx(txId)
      .catch((e) => console.error(`Wait for withdrawal prepare transaction failed: ${e}`));

    return txId;
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const rawTx = await this.inputClient.getRawTx(txId);
    const addresses = [];

    for (const vin of rawTx.vin) {
      const vinTransaction = await this.inputClient.getRawTx(vin.txid);
      addresses.push(vinTransaction.vout[vin.vout].scriptPubKey.addresses[0]);
    }

    return addresses;
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
