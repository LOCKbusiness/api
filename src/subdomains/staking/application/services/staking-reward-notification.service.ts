import { Injectable } from '@nestjs/common';
import { MailContext, MailType } from 'src/integration/notification/enums';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { RewardBatch } from '../../domain/entities/reward-batch.entity';

@Injectable()
export class StakingRewardNotificationService {
  constructor(private readonly notificationService: NotificationService) {}
  async sendMissingLiquidityWarning(targetAssetName: string, blockchain: string, type: string): Promise<void> {
    const correlationId = `RewardBatch&LiquidityCheckWarning&${targetAssetName}&${blockchain}&${type}`;
    const message = `One or more rewards were removed from batching, due to insufficient purchasable liquidity. Batch asset: ${targetAssetName} ${blockchain} ${type}`;
    const additionalMessage =
      'Caution! this mail has debounce time of 30 minutes, by the moment you read this mail required amounts might have changed.';

    await this.notificationService.sendMail({
      type: MailType.ERROR_MONITORING,
      input: {
        subject: 'Reward Payout Error - warning, liquidity about to be missing.',
        errors: [message, additionalMessage],
      },
      options: { debounce: 1800000 },
      metadata: { context: MailContext.STAKING, correlationId },
    });
  }

  async sendMissingLiquidityError(
    targetAssetName: string,
    blockchain: string,
    type: string,
    rewardIds: number[],
    message: string,
  ): Promise<void> {
    const correlationId = `RewardBatch&LiquidityCheck&${targetAssetName}&${blockchain}&${type}&Reward_IDs_${rewardIds.map(
      (id) => `${id}`,
    )}`;

    await this.notificationService.sendMail({
      type: MailType.ERROR_MONITORING,
      input: { subject: 'Reward Payout Error - liquidity is missing.', errors: [message] },
      options: { debounce: 1800000 },
      metadata: { context: MailContext.STAKING, correlationId },
    });
  }

  async sendNonRecoverableErrorMail(batch: RewardBatch, message: string, e?: Error): Promise<void> {
    const correlationId = `RewardBatch&${batch.id}`;
    const errors = e ? [message, e.message] : [message];

    await this.notificationService.sendMail({
      type: MailType.ERROR_MONITORING,
      input: { subject: 'Reward Payout Error', errors },
      options: { suppressRecurring: true },
      metadata: { context: MailContext.STAKING, correlationId },
    });
  }

  async sendRewardsPausedErrorMail(dfiAmount: number, message: string, e?: Error): Promise<void> {
    const correlationId = `RewardBatch&${dfiAmount}`;
    const errors = e ? [message, e.message] : [message];

    await this.notificationService.sendMail({
      type: MailType.ERROR_MONITORING,
      input: { subject: 'Reward Payout Error - rewards paused!', errors },
      options: { debounce: 1800000 },
      metadata: { context: MailContext.STAKING, correlationId },
    });
  }
}
