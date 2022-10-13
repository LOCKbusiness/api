import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { Withdrawal } from '../domain/entities/withdrawal.entity';
import { fromScriptHex } from '@defichain/jellyfish-address';
import { NetworkName } from '@defichain/jellyfish-network';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class StakingDeFiChainService {
  private inputClient: DeFiClient;
  private whaleClient: WhaleClient;

  constructor(
    nodeService: NodeService,
    whaleService: WhaleService,
    private readonly transactionExecutionService: TransactionExecutionService,
  ) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));

    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

  //*** PUBLIC API ***//

  async forwardDeposit(sourceAddress: string, amount: number): Promise<string> {
    return this.forwardUtxo(sourceAddress, Config.staking.liquidity.address, amount);
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    const txId = await this.transactionExecutionService.sendFromLiqToCustomer({
      to: withdrawal.staking.withdrawalAddress.address,
      amount: new BigNumber(withdrawal.amount),
    });

    return txId;
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const vins = await this.whaleClient.getTxVins(txId);
    return vins.map((vin) => fromScriptHex(vin.vout.script.hex, Config.network as NetworkName).address);
  }

  async isWithdrawalTxComplete(withdrawalTxId: string): Promise<boolean> {
    const transaction = await this.whaleClient.getTx(withdrawalTxId);

    return transaction && transaction.block.hash != null;
  }

  //*** HELPER METHODS **//

  private async forwardUtxo(sourceAddress: string, targetAddress: string, amount: number): Promise<string> {
    return this.inputClient.sendCompleteUtxo(sourceAddress, targetAddress, amount);
  }
}
