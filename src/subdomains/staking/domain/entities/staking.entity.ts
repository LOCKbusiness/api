import { Asset } from 'src/shared/models/asset/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { DepositStatus, RewardStatus, StakingStatus, WithdrawalStatus } from '../enums';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Util } from 'src/shared/util';

@Entity()
export class Staking extends IEntity {
  @Column({ length: 256, nullable: false })
  status: StakingStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  balance: number;

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: false })
  depositAddress: BlockchainAddress;

  @OneToMany(() => Deposit, (deposit) => deposit.staking, { cascade: true })
  deposits: Deposit[];

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: false })
  withdrawalAddress: BlockchainAddress;

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.staking, { cascade: true })
  withdrawals: Withdrawal[];

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: true })
  rewardsPayoutAddress: BlockchainAddress;

  @OneToMany(() => Reward, (reward) => reward.staking, { cascade: true })
  rewards: Reward[];

  @Column({ type: 'float', nullable: false, default: 1 })
  minimalStake: number;

  @Column({ type: 'float', nullable: false, default: 0.01 })
  minimalDeposit: number;

  @Column({ type: 'float', nullable: false, default: 0.05 })
  stakingFee: number;

  //*** FACTORY METHODS ***//

  static create(
    asset: Asset,
    depositAddress: BlockchainAddress,
    withdrawalAddress: BlockchainAddress,
    minimalStake: number,
    minimalDeposit: number,
    stakingFee: number,
  ): Staking {
    const staking = new Staking();

    staking.status = StakingStatus.CREATED;
    staking.asset = asset;
    staking.balance = 0;

    staking.depositAddress = depositAddress;
    staking.deposits = [];

    staking.withdrawalAddress = withdrawalAddress;
    staking.withdrawals = [];

    staking.rewardsPayoutAddress = withdrawalAddress;
    staking.rewards = [];

    staking.minimalStake = minimalStake;
    staking.minimalDeposit = minimalDeposit;
    staking.stakingFee = stakingFee;

    return staking;
  }

  //*** PUBLIC API ***//

  addDeposit(deposit: Deposit): this {
    if (!this.deposits) this.deposits = [];

    this.deposits.push(deposit);
    this.updateBalance();

    return this;
  }

  confirmDeposit(depositId: string): this {
    return this;
  }

  withdraw(withdrawal: Withdrawal): this {
    if (!this.withdrawals) this.withdrawals = [];
    if (this.status !== StakingStatus.ACTIVE) throw new BadRequestException('Staking is inactive');

    this.withdrawals.push(withdrawal);
    this.updateBalance();

    return this;
  }

  confirmWithdrawal(withdrawalId: string): this {
    return this;
  }

  addReward(reward: Reward): this {
    if (!this.rewards) this.rewards = [];

    this.rewards.push(reward);
    this.updateBalance();

    return this;
  }

  confirmRewardReinvestment(rewardId: string): this {
    return this;
  }

  setStakingFee(feePercent: number): this {
    this.stakingFee = feePercent;

    return this;
  }

  //*** HELPER METHODS ***//

  private updateBalance(): number {
    const confirmedDeposits = this.getDepositsByStatus(DepositStatus.CONFIRMED);
    const confirmedReinvestedRewards = this.getRewardsByStatus(RewardStatus.CONFIRMED);
    const confirmedWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.CONFIRMED);

    const confirmedDepositsAmount = Util.sum(confirmedDeposits.map((d) => d.amount));
    const confirmedReinvestedRewardsAmount = Util.sum(confirmedReinvestedRewards.map((r) => r.reinvestAmount));
    const confirmedWithdrawalsAmount = Util.sum(confirmedWithdrawals.map((w) => w.amount));

    this.balance = Util.round(
      confirmedDepositsAmount + confirmedReinvestedRewardsAmount - confirmedWithdrawalsAmount,
      8,
    );

    return this.balance;
  }

  //*** GETTERS ***//

  getWithdrawal(withdrawalId: string): Withdrawal {
    const withdraw = this.withdrawals.find((w) => w.id === parseInt(withdrawalId));

    if (!withdraw) throw new NotFoundException('Withdrawal not found');

    return withdraw;
  }

  getDeposit(depositId: string): Deposit {
    const deposit = this.deposits.find((w) => w.id === parseInt(depositId));

    if (!deposit) throw new NotFoundException('Deposit not found');

    return deposit;
  }

  getBalance(): number {
    return this.balance;
  }

  getPendingDepositsAmount(): number {
    const pendingDeposits = this.getDepositsByStatus(DepositStatus.PENDING);

    return Util.sum(pendingDeposits.map((d) => d.amount));
  }

  getPendingWithdrawalsAmount(): number {
    const pendingWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.PENDING);

    return Util.sum(pendingWithdrawals.map((w) => w.amount));
  }

  //*** ***//

  private getDepositsByStatus(status: DepositStatus): Deposit[] {
    return this.deposits.filter((d) => d.status === status);
  }

  private getWithdrawalsByStatus(status: WithdrawalStatus): Withdrawal[] {
    return this.withdrawals.filter((w) => w.status === status);
  }

  private getRewardsByStatus(status: RewardStatus): Reward[] {
    return this.rewards.filter((r) => r.status === status);
  }
}
