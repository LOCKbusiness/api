import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { AbortBatchCreationException } from '../exceptions/abort-batch-creation.exception';
import { Reward } from './reward.entity';

export enum RewardBatchStatus {
  CREATED = 'Created',
  SECURED = 'Secured',
  PENDING_LIQUIDITY = 'PendingLiquidity',
  PAYING_OUT = 'PayingOut',
  COMPLETE = 'Complete',
}

type IsPurchaseRequired = boolean;
type LiquidityWarning = boolean;

@Entity()
export class RewardBatch extends IEntity {
  @OneToMany(() => Reward, (reward) => reward.batch, { cascade: true })
  rewards: Reward[];

  @ManyToOne(() => Asset, { eager: true, nullable: true })
  outputReferenceAsset: Asset;

  @Column({ type: 'float', nullable: true })
  outputReferenceAmount: number;

  @ManyToOne(() => Asset, { eager: true, nullable: true })
  targetAsset: Asset;

  @Column({ type: 'float', nullable: true })
  targetAmount: number;

  @Column({ length: 256, nullable: true })
  status: RewardBatchStatus;

  @Column({ length: 256, nullable: true })
  blockchain: Blockchain;

  addTransaction(reward: Reward): this {
    reward.batch = this;

    this.rewards = [...(this.rewards ?? []), reward];

    this.outputReferenceAmount = Util.round((this.outputReferenceAmount ?? 0) + reward.outputReferenceAmount, 8);

    return this;
  }

  // amounts to be provided in reference asset
  optimizeByLiquidity(availableAmount: number, maxPurchasableAmount: number): [IsPurchaseRequired, LiquidityWarning] {
    if (this.isEnoughToSecureBatch(availableAmount)) {
      // no changes to batch required, no purchase required
      return [false, false];
    }

    if (this.isEnoughToSecureAtLeastOneTransaction(availableAmount)) {
      this.reBatchToMaxReferenceAmount(availableAmount);

      // no purchase required yet, proceeding with transactions for all available liquidity
      return [false, false];
    }

    if (
      !this.isWholeBatchAmountPurchasable(maxPurchasableAmount, 0.05) &&
      this.isEnoughToSecureAtLeastOneTransaction(maxPurchasableAmount, 0.05)
    ) {
      this.reBatchToMaxReferenceAmount(maxPurchasableAmount, 0.05);

      /**
       * purchase is required, though liquidity is not enough to purchase for entire batch -> re-batching to smaller amount *
       * warning is returned because on high load of small transactions, big transaction might be sliced out over and over again, without any notice
       */
      return [true, true];
    }

    if (!this.isEnoughToSecureAtLeastOneTransaction(maxPurchasableAmount)) {
      const { name, type, blockchain } = this.targetAsset;

      throw new AbortBatchCreationException(
        `Not enough liquidity to create batch for asset ${name} ${type} ${blockchain}.`,
      );
    }

    return [true, false];
  }

  secure(liquidity: number): this {
    this.targetAmount = liquidity;
    this.status = RewardBatchStatus.SECURED;

    const updatedRewards = this.rewards.map((r) => {
      return r.calculateOutputAmount(this.outputReferenceAmount, this.targetAmount);
    });

    this.fixRoundingMismatch();

    this.rewards = updatedRewards;

    return this;
  }

  complete(): this {
    this.status = RewardBatchStatus.COMPLETE;

    return this;
  }

  pending(): this {
    this.status = RewardBatchStatus.PENDING_LIQUIDITY;

    return this;
  }

  payingOut(): this {
    this.status = RewardBatchStatus.PAYING_OUT;

    return this;
  }

  //*** GETTERS ***//

  get smallestTransactionReferenceAmount(): number {
    return Util.minObj<Reward>(this.rewards, 'outputReferenceAmount');
  }

  //*** HELPER METHODS ***//

  private isEnoughToSecureBatch(amount: number): boolean {
    return amount >= this.outputReferenceAmount;
  }

  private isEnoughToSecureAtLeastOneTransaction(amount: number, bufferCap = 0): boolean {
    // configurable reserve cap, because purchasable amounts are indicative and may be different on actual purchase
    return amount >= this.smallestTransactionReferenceAmount * (1 + bufferCap);
  }

  private isWholeBatchAmountPurchasable(maxPurchasableAmount: number, bufferCap = 0): boolean {
    // configurable reserve cap, because purchasable amounts are indicative and may be different on actual purchase
    return maxPurchasableAmount >= this.outputReferenceAmount * (1 + bufferCap);
  }

  private reBatchToMaxReferenceAmount(liquidityLimit: number, bufferCap = 0): this {
    if (this.id || this.created) throw new Error(`Cannot re-batch previously saved batch. Batch ID: ${this.id}`);

    const currentTransactions = this.sortTransactionsAsc();
    const reBatchTransactions = [];
    let requiredLiquidity = 0;

    for (const tx of currentTransactions) {
      requiredLiquidity += tx.outputReferenceAmount;

      // configurable reserve cap, because purchasable amounts are indicative and may be different on actual purchase
      if (requiredLiquidity <= liquidityLimit * (1 - bufferCap)) {
        reBatchTransactions.push(tx);
        continue;
      }

      break;
    }

    if (reBatchTransactions.length === 0) {
      const { name, type, blockchain } = this.targetAsset;

      throw new Error(
        `Cannot re-batch transactions in batch, liquidity limit is too low. Out asset: ${name} ${type} ${blockchain}`,
      );
    }

    this.overwriteTransactions(reBatchTransactions);

    return this;
  }

  private overwriteTransactions(overwriteRewards: Reward[]): void {
    if (this.id || this.created) {
      throw new Error(`Cannot overwrite transactions of previously saved batch. Batch ID: ${this.id}`);
    }

    this.resetBatch();
    overwriteRewards.forEach((tx) => this.addTransaction(tx));
  }

  private resetBatch(): void {
    if (this.id || this.created) {
      throw new Error(`Cannot reset previously saved batch. Batch ID: ${this.id}`);
    }

    this.rewards = [];
    this.outputReferenceAmount = 0;
  }

  private fixRoundingMismatch(): void {
    const transactionsTotal = Util.sumObj<Reward>(this.rewards, 'targetAmount');

    const mismatch = Util.round(this.targetAmount - transactionsTotal, 8);

    if (mismatch === 0) {
      return;
    }

    if (Math.abs(mismatch) < 0.00001) {
      let remainsToDistribute = mismatch;
      const correction = remainsToDistribute > 0 ? 0.00000001 : -0.00000001;
      const adjustedTransactions = [];

      this.rewards.forEach((r) => {
        if (remainsToDistribute !== 0) {
          r.targetAmount = Util.round(r.targetAmount + correction, 8);
          adjustedTransactions.push(r);
          remainsToDistribute = Util.round(remainsToDistribute - correction, 8);
        }
      });

      console.info(
        `Fixed total output amount mismatch of ${mismatch} ${
          this.targetAsset.name
        }. Added to transaction ID(s): ${adjustedTransactions.map((tx) => tx.id)}`,
      );
    } else {
      throw new Error(`Output amount mismatch is too high. Mismatch: ${mismatch} ${this.targetAsset.name}`);
    }
  }

  private sortTransactionsAsc(): Reward[] {
    return this.rewards.sort((a, b) => a.outputReferenceAmount - b.outputReferenceAmount);
  }
}
