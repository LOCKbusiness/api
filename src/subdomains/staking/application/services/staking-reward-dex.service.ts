import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
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

@Injectable()
export class StakingRewardDexService {
  #rewClient: DeFiClient;

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
    const dfiAmount = await this.getDfiAmountForNewRewards();

    if (!dfiAmount) return;

    console.log(`Preparing DFI reward process in amount of ${dfiAmount} DFI`);

    await this.designateRewardsPreparation();

    try {
      await this.swapDfiToken(dfiAmount);
      await this.confirmRewardsForProcessing();

      console.log(`Prepared DFI reward process in amount of ${dfiAmount} DFI`);
    } catch (e) {
      const errorMessage = `Error while trying to prepare DFI reward payout of amount ${dfiAmount}`;
      console.error(errorMessage, e);

      await this.pauseRewards();
      await this.rewardNotificationService.sendRewardsPausedErrorMail(dfiAmount, errorMessage, e);
    }
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
      console.error(e);
    }
  }

  //*** HELPER METHODS ***//

  private async getDfiAmountForNewRewards(): Promise<number> {
    return this.rewardRepo
      .createQueryBuilder('reward')
      .leftJoin('reward.referenceAsset', 'referenceAsset')
      .select('SUM(outputReferenceAmount)', 'amount')
      .where('status = :status', { status: RewardStatus.CREATED })
      .andWhere('referenceAsset.name = :name', { name: 'DFI' })
      .andWhere('referenceAsset.blockchain = :blockchain', { blockchain: Blockchain.DEFICHAIN })
      .getRawOne<{ amount: number }>()
      .then((r) => r.amount);
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
    const swapTxId = await this.#rewClient.toToken(Config.blockchain.default.rew.address, dfiAmount);
    console.log(`Preparing DFI Reward payout process. Swapped ${dfiAmount} utxo to DFI token. SwapTxId: ${swapTxId}`);

    await this.#rewClient.waitForTx(swapTxId);
  }

  private async confirmRewardsForProcessing(): Promise<void> {
    await this.rewardRepo
      .createQueryBuilder('reward')
      .update(Reward)
      .set({ status: RewardStatus.PREPARATION_CONFIRMED })
      .where('status = :status', { status: RewardStatus.PREPARATION_PENDING })
      .execute();
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
