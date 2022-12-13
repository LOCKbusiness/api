import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { DepositStatus, RewardStatus, StakingStatus, StakingStrategy, WithdrawalStatus } from '../enums';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/models/price';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetQuery } from 'src/shared/models/asset/asset.service';
import { RewardRoute } from './reward-route.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';

export interface StakingType {
  asset: Asset;
  strategy: StakingStrategy;
}

export const StakingTypes: { [key in StakingStrategy]: AssetQuery[] } = {
  [StakingStrategy.MASTERNODE]: [{ name: 'DFI', blockchain: Blockchain.DEFICHAIN, type: AssetType.COIN }],
  [StakingStrategy.LIQUIDITY_MINING]: [{ name: 'DUSD', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN }],
};

@Entity()
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

  @OneToMany(() => Deposit, (deposit) => deposit.staking, { eager: true, cascade: true })
  deposits: Deposit[];

  @Column(() => BlockchainAddress)
  withdrawalAddress: BlockchainAddress;

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.staking, { eager: true, cascade: true })
  withdrawals: Withdrawal[];

  @OneToMany(() => RewardRoute, (route) => route.staking, { eager: true, cascade: true })
  rewardRoutes: RewardRoute[];

  @OneToMany(() => Reward, (reward) => reward.staking, { cascade: true })
  rewards: Reward[];

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

    staking.deposits = [];
    staking.withdrawals = [];
    staking.rewards = [];

    return staking;
  }

  static createDefaultRewardRoute(staking: Staking, asset: Asset, depositAddress: BlockchainAddress): RewardRoute {
    return RewardRoute.create(staking, 'Reinvest', 1, asset, depositAddress);
  }

  //*** PUBLIC API ***//

  block(): this {
    this.status = StakingStatus.BLOCKED;

    return this;
  }

  addDeposit(deposit: Deposit): this {
    if (!this.deposits) this.deposits = [];

    if (this.status === StakingStatus.BLOCKED) throw new BadRequestException('Staking is blocked');

    this.deposits.push(deposit);
    this.updateBalance();

    return this;
  }

  confirmDeposit(depositId: string, forwardTxId: string): this {
    this.status = StakingStatus.ACTIVE;

    const deposit = this.getDeposit(depositId);

    deposit.confirmDeposit(forwardTxId);
    this.updateBalance();

    return this;
  }

  addWithdrawalDraft(withdrawal: Withdrawal): this {
    if (!this.withdrawals) this.withdrawals = [];
    if (this.status !== StakingStatus.ACTIVE) throw new BadRequestException('Staking is inactive');
    if (withdrawal.status !== WithdrawalStatus.DRAFT) throw new BadRequestException('Cannot add non-Draft Withdrawals');

    // restrict creation of draft in case of insufficient balance, does not protect from parallel creation.
    if (!this.isEnoughBalanceForWithdrawal(withdrawal)) {
      throw new BadRequestException('Not sufficient staking balance to proceed with Withdrawal');
    }

    this.withdrawals.push(withdrawal);

    return this;
  }

  signWithdrawal(withdrawalId: number, signature: string): this {
    const withdrawal = this.getWithdrawal(withdrawalId);

    // double check balance before sending out
    if (!this.isEnoughBalanceForWithdrawal(withdrawal)) {
      throw new BadRequestException('Not sufficient staking balance to proceed with signing Withdrawal');
    }

    withdrawal.signWithdrawal(signature);

    return this;
  }

  changeWithdrawalAmount(withdrawalId: number, amount: number): this {
    const withdrawal = this.getWithdrawal(withdrawalId);

    withdrawal.changeAmount(amount, this);

    if (!this.isEnoughBalanceForWithdrawal(withdrawal)) {
      throw new BadRequestException('Not sufficient staking balance to proceed with signing Withdrawal');
    }

    return this;
  }

  confirmWithdrawal(withdrawalId: number): this {
    const withdrawal = this.getWithdrawal(withdrawalId);

    withdrawal.confirmWithdrawal();
    this.updateBalance();

    return this;
  }

  addReward(reward: Reward): this {
    if (!this.rewards) this.rewards = [];

    this.rewards.push(reward);
    this.updateRewardBalance();

    return this;
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

  updateBalance(): number {
    const confirmedDeposits = this.getDepositsByStatus(DepositStatus.CONFIRMED);
    const confirmedWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.CONFIRMED);

    const confirmedDepositsAmount = Util.sumObj(confirmedDeposits, 'amount');
    const confirmedWithdrawalsAmount = Util.sumObj(confirmedWithdrawals, 'amount');

    this.balance = Util.round(confirmedDepositsAmount - confirmedWithdrawalsAmount, 8);

    // staged balances (staked more than xxx days)
    const stageOneDeposits = confirmedDeposits.filter((d) => Util.daysDiff(d.created, new Date()) < 2);
    this.stageOneBalance = Math.max(0, Util.round(this.balance - Util.sumObj(stageOneDeposits, 'amount'), 8));

    const stageTwoDeposits = confirmedDeposits.filter((d) => Util.daysDiff(d.created, new Date()) < 6);
    this.stageTwoBalance = Math.max(0, Util.round(this.balance - Util.sumObj(stageTwoDeposits, 'amount'), 8));

    return this.balance;
  }

  //*** GETTERS ***//

  getWithdrawal(withdrawalId: number): Withdrawal {
    const withdraw = this.withdrawals.find((w) => w.id === withdrawalId);

    if (!withdraw) throw new NotFoundException('Withdrawal not found');

    return withdraw;
  }

  getDraftWithdrawals(): Withdrawal[] {
    return this.withdrawals.filter((w) => w.status === WithdrawalStatus.DRAFT);
  }

  getDeposit(depositId: string): Deposit {
    const deposit = this.deposits.find((w) => w.id === parseInt(depositId));

    if (!deposit) throw new NotFoundException('Deposit not found');

    return deposit;
  }

  getDepositByPayInTxId(payInTxId: string): Deposit {
    return this.deposits.find((w) => w.payInTxId === payInTxId);
  }

  getBalance(): number {
    return this.balance;
  }

  getConfirmedDeposits(): Deposit[] {
    return this.getDepositsByStatus(DepositStatus.CONFIRMED);
  }

  getPendingDeposits(): Deposit[] {
    return this.getDepositsByStatus(DepositStatus.PENDING);
  }

  getUnconfirmedDepositsAmount(): number {
    const unconfirmedDeposits = this.getDepositsByStatus([DepositStatus.OPEN, DepositStatus.PENDING]);

    return Util.sum(unconfirmedDeposits.map((d) => d.amount));
  }

  getPendingWithdrawalsAmount(): number {
    return this.getInProgressWithdrawalsAmount();
  }

  getPendingWithdrawals(): Withdrawal[] {
    return this.getWithdrawalsByStatus(WithdrawalStatus.PENDING);
  }

  getPayingOutWithdrawals(): Withdrawal[] {
    return this.getWithdrawalsByStatus(WithdrawalStatus.PAYING_OUT);
  }

  getActiveRewardRoutes(): RewardRoute[] {
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

  private updateRewardBalance(): number {
    const confirmedRewards = this.getRewardsByStatus(RewardStatus.CONFIRMED);
    const confirmedRewardsAmount = Util.sumObj(confirmedRewards, 'inputReferenceAmount');

    this.rewardsAmount = confirmedRewardsAmount;

    return this.rewardsAmount;
  }

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

  private isEnoughBalanceForWithdrawal(withdrawal: Withdrawal): boolean {
    const currentBalance = this.balance - this.getInProgressWithdrawalsAmount();

    return currentBalance >= withdrawal.amount;
  }

  private getInProgressWithdrawalsAmount(): number {
    const withdrawals = this.getWithdrawalsByStatus([WithdrawalStatus.PENDING, WithdrawalStatus.PAYING_OUT]);

    return Util.sumObj(withdrawals, 'amount');
  }

  private getDepositsByStatus(status: DepositStatus | DepositStatus[]): Deposit[] {
    return this.deposits.filter((d) => status.includes(d.status));
  }

  private getWithdrawalsByStatus(status: WithdrawalStatus | WithdrawalStatus[]): Withdrawal[] {
    return this.withdrawals.filter((w) => status.includes(w.status));
  }

  private getRewardsByStatus(status: RewardStatus): Reward[] {
    return this.rewards.filter((r) => r.status === status);
  }
}
