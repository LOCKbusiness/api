import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { LiquidityOrderContext } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { CheckLiquidityResult, CheckLiquidityRequest } from 'src/subdomains/dex/interfaces';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { Not, IsNull } from 'typeorm';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { AbortBatchCreationException } from '../../domain/exceptions/abort-batch-creation.exception';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { StakingRewardNotificationService } from './staking-reward-notification.service';

@Injectable()
export class StakingRewardBatchService {
  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly rewardBatchRepo: RewardBatchRepository,
    private readonly dexService: DexService,
    private readonly rewardNotificationService: StakingRewardNotificationService,
  ) {}

  async batchRewardsByAssets(): Promise<void> {
    try {
      const rewardsInput = await this.rewardRepo.find({
        where: {
          outputReferenceAsset: Not(IsNull()),
          outputReferenceAmount: Not(IsNull()),
          targetAsset: IsNull(),
          batch: IsNull(),
        },
        relations: ['staking', 'batch'],
      });

      if (rewardsInput.length === 0) {
        return;
      }

      console.info(
        `Reward input. Processing ${rewardsInput.length} reward(s). Reward ID(s):`,
        rewardsInput.map((r) => r.id),
      );

      const batches = await this.createBatches(rewardsInput);

      for (const batch of batches) {
        const savedBatch = await this.rewardBatchRepo.save(batch);
        const { name, type, blockchain } = savedBatch.targetAsset;
        console.info(
          `Created rewards batch. Batch ID: ${savedBatch.id}. Asset: ${name} ${type} ${blockchain}. Reward(s) count ${batch.rewards.length}`,
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  private async createBatches(rewards: Reward[]): Promise<RewardBatch[]> {
    let batches: RewardBatch[] = [];

    batches = this.batchRewards(rewards);
    batches = await this.filterOutExistingBatches(batches);
    batches = await this.optimizeBatches(batches);

    return batches;
  }

  private batchRewards(rewards: Reward[]): RewardBatch[] {
    const batches = new Map<string, RewardBatch>();

    for (const r of rewards) {
      const { outputReferenceAsset, targetAsset } = r;

      let batch = batches.get(this.getBatchTempKey(outputReferenceAsset, targetAsset));

      if (!batch) {
        batch = this.rewardBatchRepo.create({
          outputReferenceAsset,
          targetAsset,
          blockchain: targetAsset.blockchain,
          status: RewardBatchStatus.CREATED,
          rewards: [],
        });
        batches.set(this.getBatchTempKey(outputReferenceAsset, targetAsset), batch);
      }

      batch.addTransaction(r);
    }

    return [...batches.values()];
  }

  private getBatchTempKey(outputReferenceAsset: Asset, targetAsset: Asset): string {
    const { name: targetDexName, blockchain, type } = targetAsset;
    const { name: referenceDexName } = outputReferenceAsset;

    return referenceDexName + '&' + targetDexName + '&' + blockchain + '&' + type;
  }

  private async filterOutExistingBatches(batches: RewardBatch[]): Promise<RewardBatch[]> {
    const filteredBatches: RewardBatch[] = [];

    for (const batch of batches) {
      const { targetAsset } = batch;

      const existingBatch = await this.rewardBatchRepo.findOne({
        targetAsset,
        status: Not(RewardBatchStatus.COMPLETE),
      });

      if (existingBatch) {
        const rewardIds = batch.rewards.map((r) => r.id);

        console.info(
          `Halting with creation of a new batch for asset: ${targetAsset.name}, existing batch for this asset is not complete yet. Reward ID(s): ${rewardIds}`,
        );

        continue;
      }

      filteredBatches.push(batch);
    }

    return filteredBatches;
  }

  private async optimizeBatches(batches: RewardBatch[]): Promise<RewardBatch[]> {
    const optimizedBatches = [];

    for (const batch of batches) {
      try {
        const liquidity = await this.checkLiquidity(batch);

        await this.optimizeBatch(batch, liquidity);

        optimizedBatches.push(batch);
      } catch (e) {
        console.info(`Error in optimizing new batch. Batch target asset: ${batch.targetAsset.name}.`, e.message);
      }
    }

    return optimizedBatches;
  }

  private async checkLiquidity(batch: RewardBatch): Promise<CheckLiquidityResult> {
    try {
      const request = await this.createReadonlyLiquidityRequest(batch);

      return await this.dexService.checkLiquidity(request);
    } catch (e) {
      throw new Error(
        `Error in checking liquidity for a batch. Batch target asset: ${batch.targetAsset.name}. ${e.message}`,
      );
    }
  }

  private async createReadonlyLiquidityRequest(batch: RewardBatch): Promise<CheckLiquidityRequest> {
    const { targetAsset, outputReferenceAsset: referenceAsset } = batch;

    return {
      context: LiquidityOrderContext.STAKING_REWARD,
      correlationId: 'not_required_for_readonly_liquidity_request',
      referenceAsset,
      referenceAmount: batch.outputReferenceAmount,
      targetAsset,
    };
  }

  private async optimizeBatch(batch: RewardBatch, liquidity: CheckLiquidityResult): Promise<void> {
    try {
      const inputBatchLength = batch.rewards.length;

      const {
        reference: { availableAmount, maxPurchasableAmount },
      } = liquidity;

      const [_, liquidityWarning] = batch.optimizeByLiquidity(availableAmount, maxPurchasableAmount);

      liquidityWarning && (await this.handleLiquidityWarning(batch));

      if (inputBatchLength !== batch.rewards.length) {
        const { name, type, blockchain } = batch.targetAsset;
        console.log(
          `Optimized batch for target asset: ${name} ${type} ${blockchain}. ${
            inputBatchLength - batch.rewards.length
          } rewards removed from the batch`,
        );
      }
    } catch (e) {
      if (e instanceof AbortBatchCreationException) {
        await this.handleAbortBatchCreationException(batch, liquidity, e);
      }

      // re-throw by default to abort proceeding with batch
      throw e;
    }
  }

  private async handleLiquidityWarning(batch: RewardBatch): Promise<void> {
    try {
      const {
        targetAsset: { name, blockchain, type },
      } = batch;

      await this.rewardNotificationService.sendMissingLiquidityWarning(name, blockchain, type);
    } catch (e) {
      console.error('Error in handling reward batch liquidity warning', e);
    }
  }

  private async handleAbortBatchCreationException(
    batch: RewardBatch,
    liquidity: CheckLiquidityResult,
    error: AbortBatchCreationException,
  ): Promise<void> {
    try {
      const {
        target: { availableAmount, maxPurchasableAmount: maxPurchasableTargetAmount },
        reference: { maxPurchasableAmount: maxPurchasableReferenceAmount },
      } = liquidity;

      const { outputReferenceAmount, targetAsset: ta, outputReferenceAsset: ora, rewards } = batch;

      const maxPurchasableTargetAmountMessage = maxPurchasableTargetAmount
        ? `${maxPurchasableTargetAmount} ${ta.name} ${ta.type} ${ta.blockchain}.`
        : 'zero or unknown';

      const maxPurchasableReferenceAmountMessage = maxPurchasableReferenceAmount
        ? `${maxPurchasableReferenceAmount} ${ora.name} ${ora.type} ${ora.blockchain}.`
        : 'zero or unknown';

      const message = `
        ${error.message}
        Required reference amount: ${outputReferenceAmount} ${ora.name} ${ora.type} ${ora.blockchain}.
        Available amount: ${availableAmount} ${ta.name} ${ta.type} ${ta.blockchain}.
        Maximum purchasable amount (target asset, approximately): ${maxPurchasableTargetAmountMessage}.
        Maximum purchasable amount (reference asset, approximately): ${maxPurchasableReferenceAmountMessage}.
      `;

      await this.rewardNotificationService.sendMissingLiquidityError(
        ta.name,
        ta.blockchain,
        ta.type,
        rewards.map((t) => t.id),
        message,
      );
    } catch (e) {
      console.error('Error in handling AbortBatchCreationException', e);
    }
  }
}
