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

    const { quantity, biggest } = await this.getStatistics(Config.staking.liquidity.address);

    if (biggest.gte(Config.utxo.minSplitValue)) {
      const splitBy = Math.ceil(biggest.div(Config.utxo.minSplitValue).toNumber());

      await this.transactionExecutionService.splitBiggestUtxo({
        address: Config.staking.liquidity.address,
        split: splitBy,
      });
    } else if (quantity > Config.utxo.amount.max) {
      await this.transactionExecutionService.mergeSmallestUtxos({
        address: Config.staking.liquidity.address,
        merge: Config.utxo.merge,
      });
    }
  }

  private async getStatistics(address: string): Promise<UtxoStatistics> {
    const unspent = await this.utxoProviderService.retrieveAllUnspent(address);
    const sortedUnspent = unspent?.sort(UtxoProviderService.orderDescending);

    return { quantity: unspent?.length ?? 0, biggest: new BigNumber(sortedUnspent?.[0]?.vout.value) };
  }
}
