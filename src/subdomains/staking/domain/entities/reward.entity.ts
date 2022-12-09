import { Fiat } from 'src/shared/enums/fiat.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Price } from 'src/shared/models/price';
import { Util } from 'src/shared/util';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { RewardStatus } from '../enums';
import { RewardBatch } from './reward-batch.entity';
import { RewardRoute } from './reward-route.entity';
import { Staking } from './staking.entity';

@Entity()
@Index(['staking', 'txId'], { unique: true })
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

  @ManyToOne(() => RewardRoute, { eager: true, nullable: true })
  rewardRoute: RewardRoute;

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

  @Column({ type: 'float', nullable: true, default: null })
  amountEur: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountUsd: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountChf: number;

  //*** FACTORY METHODS ***//

  static create(
    staking: Staking,
    referenceAsset: Asset,
    inputReferenceAmount: number,
    outputReferenceAmount: number,
    feePercent: number,
    feeAmount: number,
    rewardRoute: RewardRoute,
  ): Reward {
    const reward = new Reward();

    reward.status = RewardStatus.CREATED;
    reward.staking = staking;
    reward.referenceAsset = referenceAsset;
    reward.inputReferenceAmount = inputReferenceAmount;
    reward.outputReferenceAmount = outputReferenceAmount;
    reward.feePercent = feePercent;
    reward.feeAmount = feeAmount;
    reward.rewardRoute = rewardRoute;

    reward.isReinvest = rewardRoute.targetAddress.isEqual(staking.depositAddress);

    return reward;
  }

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

  calculateFiatReferences(prices: Price[]): this {
    this.amountChf = Staking.calculateFiatReferenceAmount(
      Fiat.CHF,
      this.referenceAsset.name,
      this.outputReferenceAmount,
      prices,
    );
    this.amountUsd = Staking.calculateFiatReferenceAmount(
      Fiat.USD,
      this.referenceAsset.name,
      this.outputReferenceAmount,
      prices,
    );
    this.amountEur = Staking.calculateFiatReferenceAmount(
      Fiat.EUR,
      this.referenceAsset.name,
      this.outputReferenceAmount,
      prices,
    );

    return this;
  }
}
