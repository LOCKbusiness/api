import { Asset } from 'src/shared/models/asset/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { StakingStatus } from '../enums';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';

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
    return this.balance;
  }

  //*** GETTERS ***//

  getWithdrawal(withdrawalId: string): Withdrawal {
    return this.withdrawals.find((w) => w.id === parseInt(withdrawalId));
  }

  getDeposit(depositId: string): Deposit {
    return this.deposits.find((w) => w.id === parseInt(depositId));
  }

  getBalance(): number {
    // TODO - might need to diff between pending and real balance through params
    return this.balance;
  }

  getPendingDepositsAmount(): number {
    // TODO - might need to diff between pending and real balance through params
    return this.balance;
  }

  getPendingWithdrawalsAmount(): number {
    // TODO - might need to diff between pending and real balance through params
    return this.balance;
  }
}
