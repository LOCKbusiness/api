import { Injectable } from '@nestjs/common';
import { LiquidityOrderContext } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { LiquidityOrderNotReadyException } from 'src/subdomains/dex/exceptions/liquidity-order-not-ready.exception';
import { NotEnoughLiquidityException } from 'src/subdomains/dex/exceptions/not-enough-liquidity.exception';
import { PriceSlippageException } from 'src/subdomains/dex/exceptions/price-slippage.exception';
import { PurchaseLiquidityRequest, ReserveLiquidityRequest } from 'src/subdomains/dex/interfaces';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { StakingRewardNotificationService } from './staking-reward-notification.service';

@Injectable()
export class StakingRewardDexService {
  constructor(
    private readonly rewardBatchRepo: RewardBatchRepository,
    private readonly rewardNotificationService: StakingRewardNotificationService,
    private readonly dexService: DexService,
  ) {}

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
      console.error(e);
    }
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
        console.info(e.message);
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
