import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, ManyToOne } from 'typeorm';
import { RewardStatus } from '../enums';
import { RewardBatch } from './reward-batch.entity';
import { Staking } from './staking.entity';

@Entity()
export class Reward extends IEntity {
  //*** CREATION ***//

  @ManyToOne(() => RewardBatch, (batch) => batch.rewards, { eager: true, nullable: true })
  batch: RewardBatch;

  @ManyToOne(() => Staking, (staking) => staking.rewards, { nullable: false })
  staking: Staking;

  @Column({ nullable: false })
  status: RewardStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  referenceAsset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  inputReferenceAmount: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  outputReferenceAmount: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  feePercent: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  feeAmount: number;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  targetAsset: Asset;

  @Column({ nullable: true })
  targetAddress: string;

  //*** PAYOUT PROPS ***//

  @Column({ type: 'float', nullable: true })
  targetAmount: number;

  @Column({ nullable: true })
  txId: string;

  @Column({ nullable: true })
  outputDate: Date;

  //*** REINVEST PROPS ***//

  @Column({ nullable: true })
  isReinvest: boolean;

  //*** REFERENCE DATA ***//

  @Column({ type: 'float', nullable: false, default: 0 })
  amountEur: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  amountUsd: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  amountChf: number;

  //*** PUBLIC API ***//

  calculateOutputAmount(batchReferenceAmount: number, batchTargetAmount: number): this {
    if (batchReferenceAmount === 0) {
      throw new Error('Cannot calculate targetAmount, provided batchReferenceAmount is 0');
    }

    this.targetAmount = Util.round((this.outputReferenceAmount / batchReferenceAmount) * batchTargetAmount, 8);

    return this;
  }

  complete(txId: string): this {
    this.txId = txId;
    this.outputDate = new Date();
    this.status = RewardStatus.CONFIRMED;

    return this;
  }

  //*** HELPER METHODS ***//
}
