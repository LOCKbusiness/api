import { Fiat } from 'src/subdomains/pricing/domain/enums/fiat.enum';
import { Asset } from 'src/shared/entities/asset.entity';
import { BlockchainAddress } from 'src/shared/entities/blockchain-address';
import { IEntity } from 'src/shared/entities/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { RewardStatus } from '../enums';
import { RewardBatch } from './reward-batch.entity';
import { RewardRoute } from './reward-route.entity';
import { Staking } from './staking.entity';
import { Price } from 'src/subdomains/pricing/domain/entities/price';

@Entity()
@Index((r: Reward) => [r.batch, r.status, r.rewardRoute])
export class Reward extends IEntity {
  // --- CREATION --- //

  @ManyToOne(() => RewardBatch, (batch) => batch.rewards, { eager: true, nullable: true })
  batch: RewardBatch;

  @ManyToOne(() => Staking, { eager: true, nullable: false })
  staking: Staking;

  @Column({ nullable: false })
  status: RewardStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  referenceAsset: Asset;

  @Column({ type: 'float', nullable: true })
  inputReferenceAmount: number;

  @Column({ type: 'float', nullable: true })
  outputReferenceAmount: number;

  @Column({ type: 'float', nullable: true })
  feePercent: number;

  @Column({ type: 'float', nullable: true })
  feeAmount: number;

  @ManyToOne(() => RewardRoute, { eager: true, nullable: true })
  rewardRoute: RewardRoute;

  @Column(() => BlockchainAddress)
  targetAddress: BlockchainAddress;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  targetAsset: Asset;

  // --- PAYOUT PROPS --- //

  @Column({ type: 'float', nullable: true })
  targetAmount: number;

  @Column({ nullable: true })
  txId: string;

  @Column({ nullable: true })
  outputDate: Date;

  // --- REINVEST PROPS --- //

  @Column({ nullable: true })
  isReinvest: boolean;

  // --- REFERENCE DATA --- //

  @Column({ type: 'float', nullable: true, default: null })
  amountEur: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountUsd: number;

  @Column({ type: 'float', nullable: true, default: null })
  amountChf: number;

  // --- FACTORY METHODS --- //

  static create(
    staking: Staking,
    referenceAsset: Asset,
    rewardRoute: RewardRoute,
    targetAddress: BlockchainAddress,
    targetAsset: Asset,
    status?: RewardStatus,
  ): Reward {
    const reward = new Reward();

    reward.status = status ?? RewardStatus.CREATED;
    reward.staking = staking;
    reward.referenceAsset = referenceAsset;
    reward.rewardRoute = rewardRoute;
    reward.targetAddress = targetAddress;
    reward.targetAsset = targetAsset;

    reward.isReinvest = rewardRoute.isDefault || rewardRoute.targetAddress.isEqual(staking.depositAddress);

    return reward;
  }

  // --- PUBLIC API --- //

  calculateOutputAmount(batchReferenceAmount: number, batchTargetAmount: number): this {
    if (batchReferenceAmount === 0) {
      throw new Error('Cannot calculate targetAmount, provided batchReferenceAmount is 0');
    }

    this.targetAmount = Util.round((this.outputReferenceAmount / batchReferenceAmount) * batchTargetAmount, 10);

    return this;
  }

  payingOut() {
    this.status = RewardStatus.PAYING_OUT;
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

  get approxTargetAmount(): number {
    return Util.round(
      (this.outputReferenceAmount * this.referenceAsset.approxPriceUsd) / this.targetAsset.approxPriceUsd,
      10,
    );
  }
}
