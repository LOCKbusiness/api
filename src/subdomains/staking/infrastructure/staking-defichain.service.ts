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
import { Asset } from 'src/shared/models/asset/asset.entity';
import { StakingStrategy } from '../domain/enums';
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/jellyfish.service';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { UtxoProviderService } from 'src/blockchain/ain/jellyfish/utxo-provider.service';

@Injectable()
export class StakingDeFiChainService {
  private wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>;
  private inputClient: DeFiClient;
  private whaleClient: WhaleClient;

  constructor(
    nodeService: NodeService,
    whaleService: WhaleService,
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly jellyfishService: JellyfishService,
    private readonly tokenProviderService: TokenProviderService,
    private readonly utxoProvider: UtxoProviderService,
  ) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    this.wallet = this.jellyfishService.createWallet(Config.payIn.forward.phrase);
  }

  //*** PUBLIC API ***//
  async checkSync(): Promise<void> {
    await this.inputClient.checkSync();
  }

  async forwardDeposit(
    sourceAddress: string,
    amount: number,
    asset: Asset,
    strategy: StakingStrategy,
  ): Promise<string> {
    switch (strategy) {
      case StakingStrategy.MASTERNODE:
        return this.inputClient.sendCompleteUtxo(sourceAddress, Config.staking.liquidity.address, amount);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.forwardLiquidityMiningDeposit(sourceAddress, amount, asset);
    }
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    return this.transactionExecutionService.sendFromLiqToCustomer({
      to: withdrawal.staking.withdrawalAddress.address,
      amount: new BigNumber(withdrawal.amount),
      withdrawalId: withdrawal.id,
    });
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const vins = await this.whaleClient.getTxVins(txId);
    return vins.map((vin) => fromScriptHex(vin.vout.script.hex, Config.network as NetworkName).address);
  }

  async isWithdrawalTxComplete(withdrawalTxId: string): Promise<boolean> {
    const transaction = await this.whaleClient.getTx(withdrawalTxId);

    return transaction && transaction.block.hash != null;
  }

  // FORWARD TOKEN LIQ //
  private async forwardLiquidityMiningDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    console.info(`forwarding ${amount} of ${asset.name} of ${address}`);
    await this.sendFeeUtxosToDepositIfNeeded(address);
    const token = await this.tokenProviderService.get(asset.name);
    console.log(`${asset.name} has blockchain id ${token.id}`);
    const forwardToLiq = await this.jellyfishService.rawTxForForwardAccountToLiq(
      address,
      +token.id,
      new BigNumber(amount),
    );
    try {
      return this.inputClient.signAndSend(forwardToLiq.hex);
    } catch (e) {
      await this.jellyfishService.unlock(forwardToLiq);
      throw e;
    }
  }

  private async sendFeeUtxosToDepositIfNeeded(address: string): Promise<void> {
    const forwardAccount = this.wallet.get(0);
    const accountToAccountUtxo = new BigNumber(Config.payIn.forward.accountToAccountFee);
    const hasUtxo = await this.utxoProvider.addressHasUtxoExactAmount(address, accountToAccountUtxo);
    console.info(`${address} has utxo to forward? ${hasUtxo ? 'yes' : 'no'}`);
    if (!hasUtxo) {
      await this.sendFeeUtxosToDeposit(forwardAccount, address, accountToAccountUtxo);
    }
  }

  private async sendFeeUtxosToDeposit(
    forwardAccount: WhaleWalletAccount,
    depositAddress: string,
    amount: BigNumber,
  ): Promise<void> {
    const sendUtxosToDeposit = await this.jellyfishService.rawTxForSendFromTo(
      await forwardAccount.getAddress(),
      depositAddress,
      amount,
      false,
    );
    try {
      const signedSendUtxosHex = await this.jellyfishService.signRawTx(sendUtxosToDeposit, forwardAccount);
      const txSendUtxosId = await this.whaleClient.sendRaw(signedSendUtxosHex);
      console.info(`sent ${txSendUtxosId}, now waiting for blockchain...`);
      await this.whaleClient.waitForTx(txSendUtxosId, Config.payIn.forward.timeout);
      console.info(`... completed`);
    } catch (e) {
      await this.jellyfishService.unlock(sendUtxosToDeposit);
      throw e;
    }
  }
}
