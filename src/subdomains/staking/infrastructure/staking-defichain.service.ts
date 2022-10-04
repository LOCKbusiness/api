import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { Withdrawal } from '../domain/entities/withdrawal.entity';
import { fromScriptHex } from '@defichain/jellyfish-address';
import { NetworkName } from '@defichain/jellyfish-network';

@Injectable()
export class StakingDeFiChainService {
  private inputClient: DeFiClient;
  private liqClient: DeFiClient;
  private whaleClient: WhaleClient;

  constructor(nodeService: NodeService, whaleService: WhaleService) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((client) => (this.liqClient = client));

    this.whaleClient = whaleService.getClient();
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
    const vins = await this.whaleClient.getTxVins(txId);
    return vins.map((vin) => fromScriptHex(vin.vout.script.hex, Config.network as NetworkName).address);
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
