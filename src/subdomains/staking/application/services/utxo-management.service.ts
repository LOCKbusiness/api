import { AddressUnspent } from '@defichain/whale-api-client/dist/api/address';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { UtxoStatistics } from 'src/blockchain/ain/jellyfish/domain/entities/utxo-statistics';
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
    if (Config.processDisabled(Process.STAKING_LIQUIDITY_MANAGEMENT)) return;
    if (!this.lockUtxoManagement.acquire()) return;

    try {
      await this.checkUtxos();
    } catch (e) {
      console.error('Exception during utxo-management cronjob:', e);
    }

    this.lockUtxoManagement.release();
  }

  async checkUtxos(): Promise<void> {
    const liqBalance = await this.client.getUtxoBalance(Config.staking.liquidity.address);
    if (liqBalance.lt(Config.utxo.minOperateValue)) {
      console.log('Too low liquidity to operate');
      return;
    }

    const utxoStatistics = await this.getStatistics(Config.staking.liquidity.address);
    if (utxoStatistics.biggest.gte(Config.utxo.minSplitValue)) {
      await this.transactionExecutionService.splitBiggestUtxo({
        address: Config.staking.liquidity.address,
        split: Config.utxo.split,
      });
    } else if (utxoStatistics.quantity > Config.utxo.amount.max) {
      if (utxoStatistics.amountOfMerged && utxoStatistics.amountOfMerged.gt(Config.utxo.minSplitValue)) {
        console.log(`Merge would exceed limit of ${utxoStatistics.amountOfMerged.toString()}`);
        return;
      }
      await this.transactionExecutionService.mergeSmallestUtxos({
        address: Config.staking.liquidity.address,
        merge: Config.utxo.merge,
      });
    }
  }

  private async getStatistics(address: string): Promise<UtxoStatistics> {
    const unspent = await this.utxoProviderService.retrieveAllUnspent(address);
    const quantity = unspent?.length ?? 0;
    const sortedUnspent = unspent?.sort(UtxoProviderService.orderDescending);
    const biggest = new BigNumber(sortedUnspent?.[0]?.vout.value);
    const amountOfMerged =
      (unspent?.length ?? 0) > Config.utxo.merge ? this.sum(sortedUnspent?.slice(-Config.utxo.merge)) : undefined;

    return { quantity, biggest, amountOfMerged };
  }

  private sum(unspent: AddressUnspent[]): BigNumber {
    return new BigNumber(unspent.map((u) => +u.vout.value).reduce((curr, prev) => curr + prev));
  }
}
