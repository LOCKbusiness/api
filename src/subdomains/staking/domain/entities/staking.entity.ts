import { Asset } from 'src/shared/models/asset/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { DepositStatus, RewardStatus, StakingStatus, WithdrawalStatus } from '../enums';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { StakingBlockchainAddress } from './staking-blockchain-address.entity';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';

@Entity()
export class Staking extends IEntity {
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ nullable: false })
  status: StakingStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  balance: number;

  @OneToOne(() => StakingBlockchainAddress, { eager: true, nullable: false })
  @JoinColumn()
  depositAddress: StakingBlockchainAddress;

  @OneToMany(() => Deposit, (deposit) => deposit.staking, { eager: true, cascade: true })
  deposits: Deposit[];

  @ManyToOne(() => WalletBlockchainAddress, { eager: true, nullable: false })
  withdrawalAddress: WalletBlockchainAddress;

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.staking, { eager: true, cascade: true })
  withdrawals: Withdrawal[];

  @ManyToOne(() => WalletBlockchainAddress, { eager: true, nullable: false })
  rewardsPayoutAddress: WalletBlockchainAddress;

  @OneToMany(() => Reward, (reward) => reward.staking, { cascade: true })
  rewards: Reward[];

  @Column({ type: 'float', nullable: false, default: 0 })
  rewardsAmount: number;

  @Column({ type: 'float', nullable: false, default: 0.05 })
  fee: number;

  //*** FACTORY METHODS ***//

  static create(
    userId: number,
    depositAddress: StakingBlockchainAddress,
    withdrawalAddress: WalletBlockchainAddress,
    asset: Asset,
    stakingFee: number,
  ): Staking {
    const staking = new Staking();

    staking.userId = userId;
    staking.status = StakingStatus.CREATED;
    staking.asset = asset;
    staking.balance = 0;

    staking.depositAddress = depositAddress;
    staking.withdrawalAddress = withdrawalAddress;
    staking.rewardsPayoutAddress = withdrawalAddress;

    staking.deposits = [];
    staking.withdrawals = [];
    staking.rewards = [];

    staking.fee = stakingFee;

    return staking;
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

  setStakingFee(feePercent: number): this {
    this.fee = feePercent;

    return this;
  }

  verifyUserAddresses(addresses: string[]): boolean {
    return addresses.every((a) => a === this.withdrawalAddress.address);
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

  //*** HELPER METHODS ***//

  private updateBalance(): number {
    const confirmedDeposits = this.getDepositsByStatus(DepositStatus.CONFIRMED);
    const confirmedWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.CONFIRMED);

    const confirmedDepositsAmount = Util.sumObj(confirmedDeposits, 'amount');
    const confirmedWithdrawalsAmount = Util.sumObj(confirmedWithdrawals, 'amount');

    this.balance = Util.round(confirmedDepositsAmount - confirmedWithdrawalsAmount, 8);

    return this.balance;
  }

  private updateRewardBalance(): number {
    const confirmedRewards = this.getRewardsByStatus(RewardStatus.CONFIRMED);
    const confirmedRewardsAmount = Util.sumObj(confirmedRewards, 'amount');

    this.rewardsAmount = confirmedRewardsAmount;

    return this.rewardsAmount;
  }

  private isEnoughBalanceForWithdrawal(withdrawal: Withdrawal): boolean {
    const currentBalance = this.balance - this.getInProgressWithdrawalsAmount();

    return currentBalance >= withdrawal.amount;
  }

  private getInProgressWithdrawalsAmount(): number {
    const pendingWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.PENDING);
    const payingOutWithdrawals = this.getWithdrawalsByStatus(WithdrawalStatus.PAYING_OUT);

    const pendingAmount = Util.sumObj(pendingWithdrawals, 'amount');
    const payingOutAmount = Util.sumObj(payingOutWithdrawals, 'amount');

    return pendingAmount + payingOutAmount;
  }

  private getDepositsByStatus(status: DepositStatus | DepositStatus[]): Deposit[] {
    return this.deposits.filter((d) => status.includes(d.status));
  }

  private getWithdrawalsByStatus(status: WithdrawalStatus): Withdrawal[] {
    return this.withdrawals.filter((w) => w.status === status);
  }

  private getRewardsByStatus(status: RewardStatus): Reward[] {
    return this.rewards.filter((r) => r.status === status);
  }
}
