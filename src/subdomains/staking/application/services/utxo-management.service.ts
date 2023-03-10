import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { UtxoProviderService } from 'src/blockchain/ain/jellyfish/services/utxo-provider.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { Lock } from 'src/shared/lock';

@Injectable()
export class UtxoManagementService {
  private readonly lockUtxoManagement = new Lock(1800);

  private client: WhaleClient;

  constructor(
    private readonly utxoProviderService: UtxoProviderService,
    private readonly transactionExecutionService: TransactionExecutionService,
    whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((c) => (this.client = c));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async doUtxoManagement() {
    if (Config.processDisabled(Process.UTXO_MANAGEMENT)) return;
    if (!this.lockUtxoManagement.acquire()) return;

    try {
      await this.checkUtxos();
    } catch (e) {
      console.error('Exception during utxo-management cronjob:', e);
    } finally {
      this.lockUtxoManagement.release();
    }
  }

  async checkUtxos(): Promise<void> {
    const liqBalance = await this.client.getUtxoBalance(Config.staking.liquidity.address);
    if (liqBalance.lt(Config.utxo.minOperateValue)) {
      console.log('Too low liquidity to operate');
      return;
    }

    const unspent = await this.getUnspentSortedBySize(Config.staking.liquidity.address);

    const biggest = new BigNumber(unspent[0]?.vout.value);
    const quantity = unspent.length;
    const possibleMergeAmount = this.sum(unspent.slice(-Config.utxo.merge));

    if (biggest.gte(Config.utxo.minSplitValue)) {
      // split biggest UTXO
      await this.transactionExecutionService.splitBiggestUtxo({
        address: Config.staking.liquidity.address,
        split: this.getSplitCount(biggest),
      });
    } else if (quantity > Config.utxo.amount.max && this.getSplitCount(possibleMergeAmount) < Config.utxo.merge) {
      // merge smallest UTXOs
      await this.transactionExecutionService.mergeSmallestUtxos({
        address: Config.staking.liquidity.address,
        merge: Config.utxo.merge,
      });
    }
  }

  private async getUnspentSortedBySize(address: string): Promise<AddressUnspent[]> {
    const unspent = await this.utxoProviderService.retrieveAllUnspent(address);
    return unspent?.sort(UtxoProviderService.orderDescending) ?? [];
  }

  private getSplitCount(amount: BigNumber): number {
    return Math.ceil(amount.div(Config.utxo.minSplitValue).toNumber());
  }

  private sum(unspent: AddressUnspent[]): BigNumber {
    return BigNumber.sum(...unspent.map((u) => new BigNumber(u.vout.value)));
  }
}
