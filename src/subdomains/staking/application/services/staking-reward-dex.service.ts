import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { TimeoutException } from 'src/shared/exceptions/timeout.exception';
import { LiquidityOrderContext } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { LiquidityOrderNotReadyException } from 'src/subdomains/dex/exceptions/liquidity-order-not-ready.exception';
import { NotEnoughLiquidityException } from 'src/subdomains/dex/exceptions/not-enough-liquidity.exception';
import { PriceSlippageException } from 'src/subdomains/dex/exceptions/price-slippage.exception';
import { PurchaseLiquidityRequest, ReserveLiquidityRequest } from 'src/subdomains/dex/interfaces';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardStatus } from '../../domain/enums';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { StakingRewardNotificationService } from './staking-reward-notification.service';

interface DfiSwapSnapshot {
  txId: string;
  amount: number;
}

@Injectable()
export class StakingRewardDexService {
  #rewClient: DeFiClient;
  #pendingDfiSwap: DfiSwapSnapshot | null = null;

  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly rewardBatchRepo: RewardBatchRepository,
    private readonly rewardNotificationService: StakingRewardNotificationService,
    private readonly dexService: DexService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.REW).subscribe((client) => (this.#rewClient = client));
  }

  async prepareDfiToken(): Promise<void> {
    /**
     * @note
     * abort the whole process if node is unavailable
     */
    await this.checkNodeHealth();

    !this.#pendingDfiSwap ? await this.startNewPreparation() : await this.retryUnfinishedPreparation();
  }

  async secureLiquidity(): Promise<void> {
    try {
      const newBatches = await this.rewardBatchRepo.find({
        where: { status: RewardBatchStatus.CREATED },
        relations: ['rewards'],
      });

      const pendingBatches = await this.rewardBatchRepo.find({
        where: { status: RewardBatchStatus.PENDING_LIQUIDITY },
        relations: ['rewards'],
      });

      await this.checkPendingBatches(pendingBatches);
      await this.processNewBatches(newBatches);
    } catch (e) {
      console.error('Failed to secure reward liquidity:', e);
    }
  }

  //*** HELPER METHODS ***//

  private async checkNodeHealth(): Promise<void> {
    await this.#rewClient.checkSync();
  }

  private async startNewPreparation(): Promise<void> {
    await this.designateRewardsPreparation();

    const dfiAmount = await this.rewardRepo.getDfiAmountForNewRewards();

    if (!dfiAmount) return;

    console.log(`Preparing DFI reward process in amount of ${dfiAmount} DFI`);

    try {
      await this.swapDfiToken(dfiAmount);
      await this.confirmRewardsForProcessing();
    } catch (e) {
      const errorMessage = `Error while trying to prepare DFI reward payout of amount ${dfiAmount}`;
      console.error(errorMessage, e);

      e instanceof TimeoutException
        ? await this.pauseRewardsAndNotify(errorMessage, e)
        : console.log(
            'Retrying DFI preparation due to node exception during utxo-to-token swap or subsequent swap txId check',
          );

      /**
       * @note
       * throwing by default to abort next steps of the payout process
       */
      throw e;
    }
  }

  private async retryUnfinishedPreparation(): Promise<void> {
    try {
      await this.checkPendingSwap();
      await this.confirmRewardsForProcessing();
    } catch (e) {
      const errorMessage = `Error while trying to prepare DFI reward payout (retry failed) of amount ${
        this.#pendingDfiSwap.amount
      }`;
      console.error(errorMessage, e);

      await this.pauseRewardsAndNotify(errorMessage, e);

      /**
       * @note
       * throwing by default to abort next steps of the payout process
       */
      throw e;
    }
  }

  private async designateRewardsPreparation(): Promise<void> {
    await this.rewardRepo
      .createQueryBuilder('reward')
      .update(Reward)
      .set({ status: RewardStatus.PREPARATION_PENDING })
      .where('status = :status', { status: RewardStatus.CREATED })
      .execute();
  }

  private async swapDfiToken(dfiAmount: number): Promise<void> {
    let swapTxId: string;

    try {
      swapTxId = await this.#rewClient.toToken(Config.blockchain.default.rew.stakingAddress, dfiAmount);
    } catch (e) {
      /**
       * @note
       * will pause the process for given rewards, because 'timeout' error outcome is uncertain
       */
      if (e.message.includes('timeout')) {
        throw new TimeoutException('Swap DFI utxo to token timed out');
      }

      /**
       * @note
       * will result in complete restart of the process
       */
      throw e;
    }
    console.log(`Preparing DFI Reward payout process. Swapped ${dfiAmount} utxo to DFI token. SwapTxId: ${swapTxId}`);

    this.designateDfiSwap(swapTxId, dfiAmount);

    /**
     * @note
     * any error will trigger special retry mechanism via ´this.#pendingSwap´ reference
     */
    await this.#rewClient.waitForTx(swapTxId);
    console.log(`Prepared DFI reward process in amount of ${dfiAmount} DFI`);

    this.resetDfiSwapReference();
  }

  private async checkPendingSwap(): Promise<void> {
    /**
     * @note
     * any error will pause the process for given rewards
     */
    await this.#rewClient.waitForTx(this.#pendingDfiSwap.txId);
    console.log(`Prepared DFI reward process in amount of ${this.#pendingDfiSwap.amount} DFI`);

    this.resetDfiSwapReference();
  }

  private designateDfiSwap(txId: string, amount: number): void {
    this.#pendingDfiSwap = { txId, amount };
  }

  private resetDfiSwapReference(): void {
    this.#pendingDfiSwap = null;
  }

  private async confirmRewardsForProcessing(): Promise<void> {
    await this.rewardRepo
      .createQueryBuilder('reward')
      .update(Reward)
      .set({ status: RewardStatus.PREPARATION_CONFIRMED })
      .where('status = :status', { status: RewardStatus.PREPARATION_PENDING })
      .execute();
  }

  private async pauseRewardsAndNotify(errorMessage: string, error: Error): Promise<void> {
    await this.pauseRewards();
    await this.rewardNotificationService.sendRewardsPausedErrorMail(errorMessage, error);

    this.resetDfiSwapReference();
  }

  private async pauseRewards(): Promise<void> {
    await this.rewardRepo
      .createQueryBuilder('reward')
      .update(Reward)
      .set({ status: RewardStatus.PAUSED })
      .where('status = :status', { status: RewardStatus.PREPARATION_PENDING })
      .execute();
  }

  private async checkPendingBatches(pendingBatches: RewardBatch[]): Promise<void> {
    for (const batch of pendingBatches) {
      try {
        const { target: liquidity } = await this.dexService.fetchLiquidityTransactionResult(
          LiquidityOrderContext.STAKING_REWARD,
          batch.id.toString(),
        );

        batch.secure(liquidity.amount);
        await this.rewardBatchRepo.save(batch);

        console.info(`Secured liquidity for batch. Batch ID: ${batch.id}`);
      } catch (e) {
        if (e instanceof LiquidityOrderNotReadyException) {
          continue;
        }

        console.error(`Failed to check pending batch. Batch ID: ${batch.id}`, e);
      }
    }
  }

  private async processNewBatches(newBatches: RewardBatch[]): Promise<void> {
    for (const batch of newBatches) {
      try {
        const liquidity = await this.checkLiquidity(batch);

        if (liquidity !== 0) {
          batch.secure(liquidity);
          await this.rewardBatchRepo.save(batch);

          console.info(`Secured liquidity for batch. Batch ID: ${batch.id}.`);

          continue;
        }

        await this.purchaseLiquidity(batch);
      } catch (e) {
        console.info(`Error in processing new batch. Batch ID: ${batch.id}.`, e.message);
      }
    }
  }

  private async checkLiquidity(batch: RewardBatch): Promise<number> {
    try {
      const request = await this.createLiquidityRequest(batch);

      return await this.dexService.reserveLiquidity(request);
    } catch (e) {
      if (e instanceof NotEnoughLiquidityException) {
        console.info(`Not enough liquidity for batch ${batch.id} (asset ${batch.targetAsset.name}): ${e.message}`);
        return 0;
      }

      if (e instanceof PriceSlippageException) {
        await this.handleSlippageException(
          batch,
          `Slippage error while checking liquidity for asset '${batch.targetAsset.name}. Batch ID: ${batch.id}`,
          e,
        );
      }

      throw new Error(`Error in checking liquidity for a batch, ID: ${batch.id}. ${e.message}`);
    }
  }

  private async purchaseLiquidity(batch: RewardBatch) {
    let txId: string;

    try {
      const request = await this.createLiquidityRequest(batch);

      await this.dexService.purchaseLiquidity(request);

      batch.pending();
    } catch (e) {
      if (e instanceof PriceSlippageException) {
        await this.handleSlippageException(
          batch,
          `Composite swap slippage error while purchasing asset '${batch.targetAsset.name}. Batch ID: ${batch.id}`,
          e,
        );
      }

      throw new Error(
        `Error in purchasing liquidity of asset '${batch.targetAsset.name}'. Batch ID: ${batch.id}. ${e.message}`,
      );
    }

    try {
      await this.rewardBatchRepo.save(batch);
    } catch (e) {
      console.error(
        `Error in saving PENDING status after purchasing '${batch.targetAsset.name}'. Batch ID: ${batch.id}. Purchase ID: ${txId}`,
        e,
      );
      throw e;
    }
  }

  private async createLiquidityRequest(
    batch: RewardBatch,
  ): Promise<PurchaseLiquidityRequest | ReserveLiquidityRequest> {
    const { targetAsset, outputReferenceAsset: referenceAsset } = batch;

    return {
      context: LiquidityOrderContext.STAKING_REWARD,
      correlationId: batch.id.toString(),
      referenceAsset,
      referenceAmount: batch.outputReferenceAmount,
      targetAsset,
    };
  }

  private async handleSlippageException(batch: RewardBatch, message: string, e: Error): Promise<void> {
    await this.rewardNotificationService.sendNonRecoverableErrorMail(batch, message, e);
  }
}
