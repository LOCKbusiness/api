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
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
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

  async checkSync(): Promise<void> {
    await this.inputClient.checkSync();
  }

  // --- DEPOSITS --- //
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

  private async forwardMasternodeDeposit(address: string, amount: number): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.forward(
      address,
      Config.staking.liquidity.address,
      new BigNumber(amount),
    );
    return this.send(rawTx);
  }

  private async forwardLiquidityMiningDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    console.info(`forwarding ${amount} of ${asset.name} of ${address}`);
    await this.sendFeeUtxoToDepositIfNeeded(address, asset);

    const token = await this.tokenProviderService.get(asset.name);
    console.log(`${asset.name} has blockchain id ${token.id}`);

    const rawTx =
      asset.type === AssetType.TOKEN
        ? await this.rawTxService.Account.send(
            address,
            Config.yieldMachine.liquidity.address,
            +token.id,
            new BigNumber(amount),
            new BigNumber(Config.payIn.forward.accountToAccountFee),
          )
        : await this.rawTxService.Utxo.sendAsAccount(
            address,
            Config.yieldMachine.liquidity.address,
            +token.id,
            new BigNumber(amount),
          );
    return this.send(rawTx);
  }

  private async sendFeeUtxoToDepositIfNeeded(address: string, asset: Asset): Promise<void> {
    if (asset.type === AssetType.COIN) return;

    const accountToAccountUtxo = new BigNumber(Config.payIn.forward.accountToAccountFee);
    const hasUtxo = await this.utxoProvider.addressHasUtxoExactAmount(address, accountToAccountUtxo);
    console.info(`${address} has utxo to forward? ${hasUtxo ? 'yes' : 'no'}`);

    if (!hasUtxo) {
      await this.sendFeeUtxoToDeposit(address, accountToAccountUtxo);
    }
  }

  private async sendFeeUtxoToDeposit(depositAddress: string, amount: BigNumber): Promise<void> {
    const forwardAccount = this.wallet.get(0);
    const rawTx = await this.rawTxService.Utxo.sendFeeUtxo(await forwardAccount.getAddress(), depositAddress, amount);

    try {
      const txId = await this.sendFromAccount(forwardAccount, rawTx);

      console.info(`sent ${txId}, now waiting for blockchain...`);
      await this.whaleClient.waitForTx(txId, Config.payIn.forward.timeout);
      console.info(`... completed`);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(rawTx);
      throw e;
    }
  }

  async sendFeeUtxos(to: string[], amount: BigNumber): Promise<string> {
    const forwardAccount = this.wallet.get(0);
    const rawTx = await this.rawTxService.Utxo.sendFeeUtxos(await forwardAccount.getAddress(), to, amount);

    try {
      return await this.sendFromAccount(forwardAccount, rawTx);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(rawTx);
      throw e;
    }
  }

  private async sendFromAccount(account: WhaleWalletAccount, rawTx: RawTxDto) {
    const signedTx = await this.jellyfishService.signRawTx(rawTx, account);
    return this.whaleClient.sendRaw(signedTx);
  }

  private async send(rawTx: RawTxDto): Promise<string> {
    try {
      return await this.inputClient.signAndSend(rawTx.hex);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(rawTx);
      throw e;
    }
  }

  // --- WITHDRAWALS --- //
  async getPossibleWithdrawals(withdrawals: Withdrawal[]): Promise<Withdrawal[]> {
    const dfiBalance = await this.whaleClient.getUtxoBalance(Config.staking.liquidity.address);
    const dusdBalance = await this.whaleClient.getTokenBalance(Config.yieldMachine.liquidity.address, 'DUSD');

    return [
      ...this.getPossibleWithdrawalsFor(dfiBalance, 'DFI', withdrawals),
      ...this.getPossibleWithdrawalsFor(dusdBalance, 'DUSD', withdrawals),
    ];
  }

  private getPossibleWithdrawalsFor(balance: BigNumber, assetName: string, withdrawals: Withdrawal[]): Withdrawal[] {
    const sortedWithdrawals = withdrawals.filter((w) => w.asset.name === assetName).sort((a, b) => a.amount - b.amount);

    const possibleWithdrawals = [];
    let withdrawalSum = 0;
    for (const withdrawal of sortedWithdrawals) {
      withdrawalSum += withdrawal.amount;
      if (balance.minus(1).lt(withdrawalSum)) break;

      possibleWithdrawals.push(withdrawal);
    }

    return possibleWithdrawals;
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    const token = await this.tokenProviderService.get(withdrawal.asset.name);

    return this.transactionExecutionService.sendWithdrawal({
      to: withdrawal.staking.withdrawalAddress.address,
      amount: new BigNumber(withdrawal.amount),
      type: withdrawal.asset.type,
      tokenId: +token?.id,
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
}
