import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account';
import { PayInTransaction } from '../application/interfaces';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { PayIn } from '../domain/entities/payin.entity';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/services/jellyfish.service';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { AssetService } from 'src/shared/models/asset/asset.service';

interface HistoryAmount {
  amount: number;
  asset: string;
  type: AssetType;
}

@Injectable()
export class PayInDeFiChainService {
  private client: DeFiClient;

  private readonly forwardAccount: WhaleWalletAccount;
  private readonly utxoTxTypes = ['receive', 'blockReward'];
  private readonly tokenTxTypes = [
    'AccountToAccount',
    'AnyAccountsToAccounts',
    'WithdrawFromVault',
    'PoolSwap',
    'RemovePoolLiquidity',
  ];

  constructor(
    nodeService: NodeService,
    jellyfishService: JellyfishService,
    private readonly assetService: AssetService,
  ) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => {
      console.log(`New inp client received: ${client.mode}`);
      this.client = client;
    });

    this.forwardAccount = jellyfishService.createWallet(Config.payIn.forward.phrase).get(0);
  }

  //*** PUBLIC API ***//

  async getNewTransactionsSince(lastHeight: number): Promise<PayInTransaction[]> {
    const supportedAssets = await this.assetService.getAllAssetsForBlockchain(Blockchain.DEFICHAIN);
    const histories = await this.getNewTransactionsHistorySince(lastHeight);

    return this.mapHistoriesToTransactions(histories, supportedAssets);
  }

  async getConfirmedTransactions(unconfirmed: PayIn[]) {
    const { blocks: currentHeight } = await this.client.checkSync();

    return unconfirmed.filter((u) => u.txType !== 'blockReward' || currentHeight > u.blockHeight + 100);
  }

  //*** HELPER METHODS ***//

  private async getNewTransactionsHistorySince(lastHeight: number): Promise<AccountHistory[]> {
    const utxoSpenderAddress = await this.forwardAccount.getAddress();

    const { blocks: currentHeight } = await this.client.checkSync();

    return this.client
      .listHistory(lastHeight + 1, currentHeight)
      .then((i) => i.filter((h) => [...this.utxoTxTypes, ...this.tokenTxTypes].includes(h.type)))
      .then((i) => i.filter((h) => h.blockHeight > lastHeight))
      .then((i) => i.filter((h) => h.owner != utxoSpenderAddress));
  }

  private mapHistoriesToTransactions(histories: AccountHistory[], supportedAssets: Asset[]): PayInTransaction[] {
    const inputs: PayInTransaction[] = [];

    for (const history of histories) {
      const amounts = this.getAmounts(history);
      for (const amount of amounts) {
        inputs.push(this.createTransaction(history, amount, supportedAssets));
      }
    }

    return inputs.filter(this.isPayInValid);
  }

  private createTransaction(
    history: AccountHistory,
    { amount, asset, type }: HistoryAmount,
    supportedAssets: Asset[],
  ): PayInTransaction {
    const assetEntity = supportedAssets.find((a) => a.isEqual({ name: asset, type, blockchain: Blockchain.DEFICHAIN }));

    return {
      address: BlockchainAddress.create(history.owner, Blockchain.DEFICHAIN),
      txType: history.type,
      txId: history.txid,
      blockHeight: history.blockHeight,
      amount: amount,
      asset: assetEntity,
      isConfirmed: history.type != 'blockReward',
    };
  }

  private isPayInValid(tx: PayInTransaction): boolean {
    if (tx.asset == null) return false;

    const minAmount =
      tx.asset.type === AssetType.COIN ? Config.payIn.min.DeFiChain.coin : Config.payIn.min.DeFiChain.token;
    return tx.amount >= minAmount;
  }

  private getAmounts(history: AccountHistory): HistoryAmount[] {
    const amounts = this.utxoTxTypes.includes(history.type)
      ? history.amounts.map((a) => this.parseAmount(a, AssetType.COIN))
      : history.amounts.map((a) => this.parseAmount(a, AssetType.TOKEN)).filter((a) => a.amount > 0);

    return amounts.map((a) => ({ ...a, amount: Math.abs(a.amount) }));
  }

  private parseAmount(amount: string, type: AssetType): HistoryAmount {
    return { ...this.client.parseAmount(amount), type };
  }
}
