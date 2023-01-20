import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { StakingStatus, StakingStrategy, WithdrawalStatus } from '../enums';
import { BadRequestException } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/models/price';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetQuery } from 'src/shared/models/asset/asset.service';
import { RewardRoute } from './reward-route.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { StakingBalances } from '../../application/services/staking.service';

export interface StakingType {
  asset: Asset;
  strategy: StakingStrategy;
}

export interface StakingReference {
  id: number;
  strategy: StakingStrategy;
}

export const StakingTypes: { [key in StakingStrategy]: AssetQuery[] } = {
  [StakingStrategy.MASTERNODE]: [{ name: 'DFI', blockchain: Blockchain.DEFICHAIN, type: AssetType.COIN }],
  [StakingStrategy.LIQUIDITY_MINING]: [{ name: 'DUSD', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN }],
};

@Entity()
@Index((s: Staking) => [s.userId, s.strategy, s.asset], { unique: true })
export class Staking extends IEntity {
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ nullable: false })
  status: StakingStatus;

  @Column({ nullable: false, default: StakingStrategy.MASTERNODE })
  strategy: StakingStrategy;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  balance: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  stageOneBalance: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  stageTwoBalance: number;

  @Column(() => BlockchainAddress)
  depositAddress: BlockchainAddress;

  @Column(() => BlockchainAddress)
  withdrawalAddress: BlockchainAddress;

  @OneToMany(() => RewardRoute, (route) => route.staking, { eager: true, cascade: true })
  rewardRoutes: RewardRoute[];

  @Column({ type: 'float', nullable: false, default: 0 })
  rewardsAmount: number;

  @Column({ type: 'float', nullable: true })
  fee: number;

  //*** FACTORY METHODS ***//

  static create(
    userId: number,
    { asset, strategy }: StakingType,
    depositAddress: BlockchainAddress,
    withdrawalAddress: BlockchainAddress,
  ): Staking {
    const staking = new Staking();

    staking.userId = userId;
    staking.status = StakingStatus.CREATED;
    staking.strategy = strategy;
    staking.asset = asset;
    staking.balance = 0;

    staking.depositAddress = depositAddress;
    staking.withdrawalAddress = withdrawalAddress;
    staking.rewardRoutes = [this.createDefaultRewardRoute(staking, asset, depositAddress)];

    return staking;
  }

  static createDefaultRewardRoute(staking: Staking, asset: Asset, depositAddress: BlockchainAddress): RewardRoute {
    return RewardRoute.create(staking, 'Reinvest', 1, asset, depositAddress);
  }

  //*** PUBLIC API ***//

  activate(): this {
    this.status = StakingStatus.ACTIVE;

    return this;
  }

  block(): this {
    this.status = StakingStatus.BLOCKED;

    return this;
  }

  updateBalance({ currentBalance, stageOneBalance, stageTwoBalance }: StakingBalances): this {
    this.balance = currentBalance;
    this.stageOneBalance = stageOneBalance;
    this.stageTwoBalance = stageTwoBalance;

    return this;
  }

  updateRewardsAmount(rewardsAmount: number): this {
    this.rewardsAmount = rewardsAmount;

    return this;
  }

  checkWithdrawalDraftOrThrow(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): void {
    if (this.status !== StakingStatus.ACTIVE) throw new BadRequestException('Staking is inactive');
    if (withdrawal.status !== WithdrawalStatus.DRAFT) throw new BadRequestException('Cannot add non-Draft Withdrawals');

    // restrict creation of draft in case of insufficient balance, does not protect from parallel creation.
    this.checkBalanceForWithdrawalOrThrow(withdrawal, inProgressWithdrawalsAmount);
  }

  checkBalanceForWithdrawalOrThrow(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): void {
    if (!this.isEnoughBalanceForWithdrawal(withdrawal, inProgressWithdrawalsAmount)) {
      throw new BadRequestException('Not sufficient staking balance to proceed with Withdrawal');
    }
  }

  setRewardRoutes(newRewardRoutes: RewardRoute[]): this {
    this.validateRewardDistribution(newRewardRoutes);
    this.validateDuplicatedRoutes(newRewardRoutes);

    this.updateRewardRoutes(newRewardRoutes);

    return this;
  }

  setStakingFee(feePercent: number): this {
    this.fee = feePercent;

    return this;
  }

  verifyUserAddresses(addresses: string[]): boolean {
    return addresses.every((a) => a === this.withdrawalAddress.address);
  }

  //*** GETTERS ***//

  get isActive(): boolean {
    return this.status === StakingStatus.ACTIVE;
  }

  get isNotActive(): boolean {
    return this.status === StakingStatus.CREATED;
  }

  get isBlocked(): boolean {
    return this.status === StakingStatus.BLOCKED;
  }

  get activeRewardRoutes(): RewardRoute[] {
    return this.rewardRoutes.filter((r) => r.rewardPercent !== 0);
  }

  //*** HELPER STATIC METHODS ***//

  static calculateFiatReferenceAmount(fiatName: Fiat, assetName: string, assetAmount: number, prices: Price[]): number {
    const price = prices.find((p) => p.source === fiatName && p.target === assetName);

    if (!price) {
      throw new Error(`Cannot calculate reference Fiat amount, ${assetName}/${fiatName} price is missing`);
    }

    if (!price.price) {
      throw new Error(`Cannot calculate reference Fiat amount of ${assetName}/${fiatName} , price value is 0`);
    }

    return Util.round(assetAmount * price.price, 2);
  }

  //*** HELPER METHODS ***//

  private validateRewardDistribution(newRewardRoutes: RewardRoute[]): void {
    const totalDistribution = Util.sumObj<RewardRoute>(newRewardRoutes, 'rewardPercent');

    if (totalDistribution !== 1) {
      throw new BadRequestException(
        `Cannot create reward strategy. Total reward distribution must be 100%, instead distributed total of ${Util.round(
          totalDistribution * 100,
          2,
        )}%`,
      );
    }
  }

  private validateDuplicatedRoutes(newRewardRoutes: RewardRoute[]): void {
    newRewardRoutes.forEach((route) => {
      const duplicatedRoute = this.findDuplicatedRoute(route, newRewardRoutes);

      if (duplicatedRoute) {
        throw new BadRequestException(
          `Cannot create reward strategy. Provided duplicated route for asset ${duplicatedRoute.targetAsset.name} and address ${duplicatedRoute.targetAddress.address}`,
        );
      }
    });
  }

  private findDuplicatedRoute(currentRoute: RewardRoute, allRewardRoutes: RewardRoute[]): RewardRoute | null {
    return allRewardRoutes.some((r, index) => allRewardRoutes.findIndex((_r) => _r.isEqual(r)) !== index)
      ? currentRoute
      : null;
  }

  private updateRewardRoutes(newRewardRoutes: RewardRoute[]): void {
    this.resetExistingRoutes();

    newRewardRoutes.forEach((newRoute) => {
      const existingRoute = this.rewardRoutes.find((r) => r.isEqual(newRoute));

      if (existingRoute) {
        existingRoute.updateRoute(newRoute.label, newRoute.rewardPercent);
        return;
      }

      this.rewardRoutes.push(newRoute);
    });
  }

  private resetExistingRoutes(): void {
    this.rewardRoutes.forEach((route) => (route.rewardPercent = 0));
  }

  private isEnoughBalanceForWithdrawal(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): boolean {
    const currentBalance = this.balance - inProgressWithdrawalsAmount;

    return currentBalance >= withdrawal.amount;
  }
}
