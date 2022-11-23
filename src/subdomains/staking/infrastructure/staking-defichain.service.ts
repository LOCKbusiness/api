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
import { JellyfishService } from 'src/blockchain/ain/jellyfish/services/jellyfish.service';
import { TokenProviderService } from 'src/blockchain/ain/whale/token-provider.service';
import { UtxoProviderService } from 'src/blockchain/ain/jellyfish/services/utxo-provider.service';
import { RawTxService } from 'src/blockchain/ain/jellyfish/services/raw-tx.service';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

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
    private readonly rawTxService: RawTxService,
    private readonly tokenProviderService: TokenProviderService,
    private readonly utxoProvider: UtxoProviderService,
  ) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    this.wallet = this.jellyfishService.createWallet(Config.payIn.forward.phrase);
  }

  // --- PUBLIC API --- //
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
        return this.forwardMasternodeDeposit(sourceAddress, amount);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.forwardLiquidityMiningDeposit(sourceAddress, amount, asset);
    }
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    return this.transactionExecutionService.sendWithdrawal({
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

  // --- FORWARDING HELPERS --- //
  private async forwardMasternodeDeposit(address: string, amount: number): Promise<string> {
    const forwardToLiq = await this.rawTxService.Utxo.forward(
      address,
      Config.staking.liquidity.address,
      new BigNumber(amount),
    );
    return await this.send(forwardToLiq);
  }

  private async forwardLiquidityMiningDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    console.info(`forwarding ${amount} of ${asset.name} of ${address}`);
    await this.sendFeeUtxosToDepositIfNeeded(address);
    const token = await this.tokenProviderService.get(asset.name);
    console.log(`${asset.name} has blockchain id ${token.id}`);
    const forwardToLiq = await this.rawTxService.Account.send(
      address,
      Config.yieldMachine.liquidity.address,
      +token.id,
      new BigNumber(amount),
      new BigNumber(Config.payIn.forward.accountToAccountFee),
    );
    return await this.send(forwardToLiq);
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
    const sendUtxosToDeposit = await this.rawTxService.Utxo.sendFeeUtxo(
      await forwardAccount.getAddress(),
      depositAddress,
      amount,
    );
    try {
      const signedSendUtxosHex = await this.jellyfishService.signRawTx(sendUtxosToDeposit, forwardAccount);
      const txSendUtxosId = await this.whaleClient.sendRaw(signedSendUtxosHex);
      console.info(`sent ${txSendUtxosId}, now waiting for blockchain...`);
      await this.whaleClient.waitForTx(txSendUtxosId, Config.payIn.forward.timeout);
      console.info(`... completed`);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(sendUtxosToDeposit);
      throw e;
    }
  }

  private async send(rawTx: RawTxDto): Promise<string> {
    try {
      return await this.inputClient.signAndSend(rawTx.hex);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(rawTx);
      throw e;
    }
  }
}
