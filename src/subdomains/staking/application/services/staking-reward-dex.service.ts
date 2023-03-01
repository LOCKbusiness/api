import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/util';
import { LiquidityOrderContext } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { LiquidityOrderNotReadyException } from 'src/subdomains/dex/exceptions/liquidity-order-not-ready.exception';
import { NotEnoughLiquidityException } from 'src/subdomains/dex/exceptions/not-enough-liquidity.exception';
import { PriceSlippageException } from 'src/subdomains/dex/exceptions/price-slippage.exception';
import { PurchaseLiquidityRequest, ReserveLiquidityRequest } from 'src/subdomains/dex/interfaces';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { Not } from 'typeorm';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { StakingRewardNotificationService } from './staking-reward-notification.service';

@Injectable()
export class StakingRewardDexService {
  #rewClient: DeFiClient;
  #whaleClient: WhaleClient;

  constructor(
    private readonly rewardBatchRepo: RewardBatchRepository,
    private readonly rewardNotificationService: StakingRewardNotificationService,
    private readonly dexService: DexService,
    nodeService: NodeService,
    whaleService: WhaleService,
  ) {
    nodeService.getConnectedNode(NodeType.REW).subscribe((client) => (this.#rewClient = client));
    whaleService.getClient().subscribe((client) => (this.#whaleClient = client));
  }

  async getRewardVolumeBetween(from: Date, to: Date): Promise<number> {
    const [fromBlock, toBlock] = await Promise.all([
      this.#whaleClient.getNearestBlockAt(from),
      this.#whaleClient.getNearestBlockAt(to),
    ]);

    const history = await this.#rewClient.listHistory(
      fromBlock - 10,
      toBlock + 10,
      Config.blockchain.default.rew.address,
    );

    const rewards = history
      .filter(
        (h) => h.type === 'blockReward' && new Date(h.blockTime * 1000) > from && new Date(h.blockTime * 1000) < to,
      )
      .map((r) => +r.amounts[0].split('@')[0]);

    return Util.sum(rewards);
  }

  async prepareDfiToken(): Promise<void> {
    /**
     * @note
     * abort the whole process if node is unavailable
     */
    await this.checkNodeHealth();

    const pendingBatch = await this.rewardBatchRepo.findOneBy({ status: Not(RewardBatchStatus.COMPLETE) });
    if (pendingBatch != null) return;

    await this.startNewPreparation();
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
    try {
      const dfiBalance = await this.#rewClient.getBalance();
      if (dfiBalance.lt(500)) return;

      const dfiAmount = dfiBalance.minus(100).toNumber();
      await this.swapDfiToken(dfiAmount);
    } catch (e) {
      console.error(`Error during reward payout token preparation:`, e);
      throw e;
    }
  }

  private async swapDfiToken(dfiAmount: number): Promise<void> {
    const swapTxId = await this.#rewClient.toToken(Config.blockchain.default.rew.address, dfiAmount);

    console.log(`Reward payout process: swapped ${dfiAmount} DFI UTXO to token: ${swapTxId}`);
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
