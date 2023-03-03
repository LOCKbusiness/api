import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Reward } from './reward.entity';

export enum RewardBatchStatus {
  CREATED = 'Created',
  SECURED = 'Secured',
  PENDING_LIQUIDITY = 'PendingLiquidity',
  PAYING_OUT = 'PayingOut',
  COMPLETE = 'Complete',
}

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

  addTransaction(reward: Reward): this {
    reward.batch = this;

    this.rewards = [...(this.rewards ?? []), reward];

    this.outputReferenceAmount = Util.round((this.outputReferenceAmount ?? 0) + reward.outputReferenceAmount, 8);

    return this;
  }

  secure(liquidity: number): this {
    this.targetAmount = liquidity;
    this.status = RewardBatchStatus.SECURED;

    this.rewards.forEach((r) => {
      return r.calculateOutputAmount(this.outputReferenceAmount, this.targetAmount);
    });

    this.fixRoundingMismatch();

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

  private fixRoundingMismatch(): void {
    const transactionsTotal = Util.sumObj<Reward>(this.rewards, 'targetAmount');

    const mismatch = Util.round(this.targetAmount - transactionsTotal, 16);

    if (mismatch === 0) {
      return;
    }

    if (Math.abs(mismatch) < 0.00001) {
      let remainsToDistribute = mismatch;
      const correction = remainsToDistribute > 0 ? 1e-16 : -1e-16;
      const adjustedTransactions = [];

      this.rewards.forEach((r) => {
        if (remainsToDistribute !== 0) {
          r.targetAmount = Util.round(r.targetAmount + correction, 16);
          adjustedTransactions.push(r);
          remainsToDistribute = Util.round(remainsToDistribute - correction, 16);
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
}
