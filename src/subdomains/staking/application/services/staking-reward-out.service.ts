import { Injectable } from '@nestjs/common';
import { LiquidityOrderContext } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrderContext } from 'src/subdomains/payout/entities/payout-order.entity';
import { PayoutRequest } from 'src/subdomains/payout/interfaces';
import { PayoutService } from 'src/subdomains/payout/services/payout.service';
import { In } from 'typeorm';
import { RewardBatch, RewardBatchStatus } from '../../domain/entities/reward-batch.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardStatus } from '../../domain/enums';
import { RewardBatchRepository } from '../repositories/reward-batch.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { StakingService } from './staking.service';

@Injectable()
export class StakingRewardOutService {
  constructor(
    private readonly rewardRepo: RewardRepository,
    private readonly rewardBatchRepo: RewardBatchRepository,
    private readonly dexService: DexService,
    private readonly payoutService: PayoutService,
    private readonly stakingService: StakingService,
  ) {}

  async payoutRewards(): Promise<void> {
    try {
      const batches = await this.fetchBatchesForPayout();

      if (batches.length === 0) {
        return;
      }

      for (const batch of batches) {
        if (batch.status === RewardBatchStatus.PAYING_OUT) {
          try {
            await this.checkCompletion(batch);
          } catch (e) {
            console.error(`Error on checking pervious payout for a batch ID: ${batch.id}`, e);
            continue;
          }

          if (batch.status !== RewardBatchStatus.PAYING_OUT) {
            continue;
          }
        }

        batch.payingOut();
        await this.rewardBatchRepo.save(batch);

        const successfulRequests = [];

        for (const reward of batch.rewards.filter((r) => r.status === RewardStatus.READY)) {
          try {
            await this.doPayout(reward);
            successfulRequests.push(reward);
          } catch (e) {
            console.error(`Failed to initiate buy-crypto payout. Transaction ID: ${reward.id}`);
            // continue with next transaction in case payout initiation failed
            continue;
          }
        }

        this.logRewardsPayouts(successfulRequests);
      }
    } catch (e) {
      console.error('Failed to payout rewards:', e);
    }
  }

  //*** HELPER METHODS ***//

  private async fetchBatchesForPayout(): Promise<RewardBatch[]> {
    return this.rewardBatchRepo.find({
      where: {
        // PAYING_OUT batches are fetch for retry in case of failure in previous iteration
        status: In([RewardBatchStatus.SECURED, RewardBatchStatus.PAYING_OUT]),
      },
      relations: ['rewards'],
    });
  }

  private async doPayout(reward: Reward): Promise<void> {
    const request: PayoutRequest = {
      context: PayoutOrderContext.STAKING_REWARD,
      correlationId: reward.id.toString(),
      asset: reward.targetAsset,
      amount: reward.targetAmount,
      destinationAddress: reward.targetAddress.address,
    };

    await this.payoutService.doPayout(request);

    reward.payingOut();
    await this.rewardRepo.save(reward);
  }

  private async checkCompletion(batch: RewardBatch) {
    for (const r of batch.rewards) {
      if (r.status === RewardStatus.CONFIRMED) {
        continue;
      }

      try {
        const { isComplete, payoutTxId } = await this.payoutService.checkOrderCompletion(
          PayoutOrderContext.STAKING_REWARD,
          r.id.toString(),
        );

        if (isComplete) {
          r.complete(payoutTxId);
          await this.rewardRepo.save(r);
          /**
           * @note
           * potential case of updateRewardsAmount failure is tolerated
           */
          await this.stakingService.updateRewardsAmount(r.staking.id);
        }
      } catch (e) {
        console.error(`Error on validating reward completion. ID: ${r.id}.`, e);
        continue;
      }
    }

    const isBatchComplete = batch.rewards.every((r) => r.status === RewardStatus.CONFIRMED);

    if (isBatchComplete) {
      console.info(`Reward batch payout complete. Batch ID: ${batch.id}`);
      batch.complete();

      await this.rewardBatchRepo.save(batch);
      await this.dexService.completeOrders(LiquidityOrderContext.STAKING_REWARD, batch.id.toString());
    }
  }

  //*** LOGS ***//

  private logRewardsPayouts(rewards: Reward[]): void {
    const rewardsLogs = rewards.map((r) => r.id);

    rewards.length && console.info(`Paying out ${rewardsLogs.length} reward(s). Reward ID(s):`, rewardsLogs);
  }
}
