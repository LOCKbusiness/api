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
import { Asset, AssetType } from 'src/shared/entities/asset.entity';
import { StakingStrategy } from '../domain/enums';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/services/jellyfish.service';
import { UtxoProviderService } from 'src/blockchain/ain/jellyfish/services/utxo-provider.service';
import { RawTxService } from 'src/blockchain/ain/jellyfish/services/raw-tx.service';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { StakingTypes } from '../domain/entities/staking.entity';
import { AssetQuery } from 'src/shared/services/asset.service';
import { Util } from 'src/shared/util';

@Injectable()
export class StakingDeFiChainService {
  private forwardWallet: WhaleWalletAccount;
  private inputClient: DeFiClient;
  private whaleClient: WhaleClient;

  constructor(
    nodeService: NodeService,
    whaleService: WhaleService,
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly jellyfishService: JellyfishService,
    private readonly rawTxService: RawTxService,
    private readonly utxoProvider: UtxoProviderService,
  ) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inputClient = client));
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    this.forwardWallet = this.jellyfishService.createWallet(Config.payIn.forward.phrase).get(0);
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
        return this.forwardMasternodeDeposit(sourceAddress, amount, asset);
      case StakingStrategy.LIQUIDITY_MINING:
        return this.forwardLiquidityMiningDeposit(sourceAddress, amount, asset);
    }
  }

  private async forwardMasternodeDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    const rawTx = await this.getRawTxForwardMasternodeDeposit(address, amount, asset);

    return this.send(rawTx);
  }

  private async getRawTxForwardMasternodeDeposit(address: string, amount: number, asset: Asset): Promise<RawTxDto> {
    if (asset.type === AssetType.TOKEN) {
      await this.sendFeeUtxoToDepositIfNeeded(address, asset, new BigNumber(Config.payIn.forward.accountToUtxoFee));

      return this.rawTxService.Account.toUtxo(
        address,
        Config.staking.liquidity.address,
        new BigNumber(amount),
        false,
        new BigNumber(Config.payIn.forward.accountToUtxoFee),
      );
    } else {
      return this.rawTxService.Utxo.forward(address, Config.staking.liquidity.address, new BigNumber(amount), false);
    }
  }

  private async forwardLiquidityMiningDeposit(address: string, amount: number, asset: Asset): Promise<string> {
    await this.sendFeeUtxoToDepositIfNeeded(address, asset, new BigNumber(Config.payIn.forward.accountToAccountFee));

    const rawTx =
      asset.type === AssetType.TOKEN
        ? await this.rawTxService.Account.send(
            address,
            Config.yieldMachine.liquidity.address,
            +asset.chainId,
            new BigNumber(amount),
            false,
            new BigNumber(Config.payIn.forward.accountToAccountFee),
          )
        : await this.rawTxService.Utxo.sendAsAccount(
            address,
            Config.yieldMachine.liquidity.address,
            +asset.chainId,
            new BigNumber(amount),
            false,
          );
    return this.send(rawTx);
  }

  private async sendFeeUtxoToDepositIfNeeded(address: string, asset: Asset, feeAmount: BigNumber): Promise<void> {
    if (asset.type === AssetType.COIN) return;

    const hasUtxo = await this.utxoProvider.addressHasUtxoExactAmount(address, feeAmount);

    if (!hasUtxo) {
      await this.sendFeeUtxoToDeposit(address, feeAmount);
    }
  }

  private async sendFeeUtxoToDeposit(depositAddress: string, amount: BigNumber): Promise<void> {
    const rawTx = await this.rawTxService.Utxo.sendFeeUtxo(
      await this.forwardWallet.getAddress(),
      depositAddress,
      amount,
      true,
    );

    const txId = await this.sendFromAccount(this.forwardWallet, rawTx);

    await this.whaleClient.waitForTx(txId, Config.payIn.forward.timeout);
  }

  async sendFeeUtxos(to: string[], amount: BigNumber): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.sendFeeUtxos(await this.forwardWallet.getAddress(), to, amount, true);

    return this.sendFromAccount(this.forwardWallet, rawTx);
  }

  private async sendFromAccount(account: WhaleWalletAccount, rawTx: RawTxDto) {
    try {
      const signedTx = await this.jellyfishService.signRawTx(rawTx, account);
      return await this.whaleClient.sendRaw(signedTx);
    } catch (e) {
      await this.rawTxService.unlockUtxosOf(rawTx);
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

  // --- WITHDRAWALS --- //
  async getPossibleWithdrawals(withdrawals: Withdrawal[]): Promise<Withdrawal[]> {
    const mnBalances = await Promise.all(
      StakingTypes[StakingStrategy.MASTERNODE].map((asset) =>
        this.getBalanceFor(asset, Config.staking.liquidity.address),
      ),
    );
    const lmBalances = await Promise.all(
      StakingTypes[StakingStrategy.LIQUIDITY_MINING].map((asset) =>
        this.getBalanceFor(asset, Config.yieldMachine.liquidity.address),
      ),
    );

    return [...mnBalances, ...lmBalances]
      .map(({ balance, asset }) => this.getPossibleWithdrawalsFor(balance, asset, withdrawals))
      .reduce((prev, curr) => prev.concat(curr), []);
  }

  private async getBalanceFor(asset: AssetQuery, address: string): Promise<{ asset: AssetQuery; balance: BigNumber }> {
    const balance =
      asset.type === AssetType.COIN
        ? await this.whaleClient.getUtxoBalance(address).then((b) => b.minus(0.1))
        : await this.whaleClient.getTokenBalance(address, asset.name);

    return {
      asset,
      balance,
    };
  }

  private getPossibleWithdrawalsFor(balance: BigNumber, asset: AssetQuery, withdrawals: Withdrawal[]): Withdrawal[] {
    const priorityThreshold = Util.daysBefore(1);

    const sortedWithdrawals = withdrawals.filter((w) => w.asset.isEqual(asset)).sort((a, b) => a.amount - b.amount);
    const priorityWithdrawals = sortedWithdrawals.filter((w) => w.created <= priorityThreshold);
    const standardWithdrawals = sortedWithdrawals.filter((w) => w.created > priorityThreshold);

    const possibleWithdrawals = [];
    let withdrawalSum = 0;
    for (const withdrawal of [...priorityWithdrawals, ...standardWithdrawals]) {
      withdrawalSum += withdrawal.amount;
      if (balance.lt(withdrawalSum)) break;

      possibleWithdrawals.push(withdrawal);
    }

    return possibleWithdrawals;
  }

  async sendWithdrawal(withdrawal: Withdrawal): Promise<string> {
    return this.transactionExecutionService.sendWithdrawal({
      to: withdrawal.staking.withdrawalAddress.address,
      amount: new BigNumber(withdrawal.amount),
      type: withdrawal.asset.type,
      tokenId: +withdrawal.asset.chainId,
      withdrawalId: withdrawal.id,
    });
  }

  async getSourceAddresses(txId: string): Promise<string[]> {
    const vins = await this.whaleClient.getTxVins(txId);
    return vins.map((vin) => fromScriptHex(vin.vout.script.hex, Config.network as NetworkName).address);
  }

  async isWithdrawalTxComplete(withdrawalTxId: string): Promise<boolean> {
    const transaction = await this.whaleClient.getTx(withdrawalTxId);
    return transaction?.block?.hash != null;
  }
}
