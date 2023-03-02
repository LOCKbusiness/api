import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { Not } from 'typeorm';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { RewardRepository } from '../repositories/reward.repository';

@Injectable()
export class StakingRewardBatchService {
  constructor(private readonly rewardRepo: RewardRepository, private readonly rewardBatchRepo: RewardBatchRepository) {}

  async batchRewardsByAssets(): Promise<void> {
    try {
      const rewardsInput = await this.rewardRepo.getNewRewards();
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
      console.error('Failed to batch rewards:', e);
    }
  }

  private async createBatches(rewards: Reward[]): Promise<RewardBatch[]> {
    let batches: RewardBatch[] = [];

    batches = this.batchRewards(rewards);
    batches = await this.filterOutExistingBatches(batches);

    return batches;
  }

  private batchRewards(rewards: Reward[]): RewardBatch[] {
    const batches = new Map<string, RewardBatch>();

    for (const r of rewards) {
      const { referenceAsset, targetAsset } = r;

      let batch = batches.get(this.getBatchTempKey(referenceAsset, targetAsset));

      if (!batch) {
        batch = this.rewardBatchRepo.create({
          outputReferenceAsset: referenceAsset,
          targetAsset: targetAsset,
          status: RewardBatchStatus.CREATED,
          rewards: [],
        });
        batches.set(this.getBatchTempKey(referenceAsset, targetAsset), batch);
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
      const { outputReferenceAsset, targetAsset } = batch;

      const existingBatch = await this.rewardBatchRepo.findOneBy({
        outputReferenceAsset: { id: outputReferenceAsset.id },
        targetAsset: { id: targetAsset.id },
        status: Not(RewardBatchStatus.COMPLETE),
      });

      // double check to avoid more than one batch for reference/target asset pair
      const currentBatch = filteredBatches.find(
        (b) => b.outputReferenceAsset.id === outputReferenceAsset.id && b.targetAsset.id === targetAsset.id,
      );

      if (existingBatch || currentBatch) {
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
}
