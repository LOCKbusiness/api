import { Asset, AssetType } from 'src/shared/entities/asset.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/entities/entity';
import { StakingStatus, StakingStrategy, WithdrawalStatus } from '../enums';
import { BadRequestException } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { Fiat } from 'src/subdomains/pricing/domain/enums/fiat.enum';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetQuery } from 'src/shared/services/asset.service';
import { BlockchainAddress } from 'src/shared/entities/blockchain-address';
import { StakingBalance } from './staking-balance.entity';
import { StakingBalances } from '../../application/services/staking.service';
import { RewardStrategy } from './reward-strategy.entity';
import { RewardRoute } from './reward-route.entity';
import { Price } from 'src/subdomains/pricing/domain/entities/price';

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
  [StakingStrategy.LIQUIDITY_MINING]: [
    { name: 'DUSD', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'DFI', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'BTC', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'ETH', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'USDT', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'USDC', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
    { name: 'EUROC', blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN },
  ],
};

@Entity()
@Index((s: Staking) => [s.userId, s.strategy], { unique: true })
export class Staking extends IEntity {
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ nullable: false })
  status: StakingStatus;

  @Column({ nullable: false, default: Blockchain.DEFICHAIN })
  blockchain: Blockchain;

  @Column({ nullable: false, default: StakingStrategy.MASTERNODE })
  strategy: StakingStrategy;

  @OneToMany(() => StakingBalance, (balance) => balance.staking, { eager: true, cascade: true })
  balances: StakingBalance[];

  @Column(() => BlockchainAddress)
  depositAddress: BlockchainAddress;

  @Column(() => BlockchainAddress)
  withdrawalAddress: BlockchainAddress;

  @ManyToOne(() => RewardStrategy, (strategy) => strategy.stakings, { nullable: false, eager: true, cascade: true })
  rewardStrategy: RewardStrategy;

  @Column({ type: 'float', nullable: true })
  fee: number;

  //*** FACTORY METHODS ***//

  static create(
    userId: number,
    strategy: StakingStrategy,
    blockchain: Blockchain,
    assetList: Asset[],
    depositAddress: BlockchainAddress,
    withdrawalAddress: BlockchainAddress,
    rewardStrategy: RewardStrategy,
  ): Staking {
    const staking = new Staking();

    staking.userId = userId;
    staking.status = StakingStatus.CREATED;
    staking.strategy = strategy;
    staking.blockchain = blockchain;

    staking.balances = assetList.map((a) => StakingBalance.create(a));

    staking.depositAddress = depositAddress;
    staking.withdrawalAddress = withdrawalAddress;
    staking.rewardStrategy = rewardStrategy;

    return staking;
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

  checkWithdrawalDraftOrThrow(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): void {
    if (this.status !== StakingStatus.ACTIVE) throw new BadRequestException('Staking is inactive');
    if (withdrawal.status !== WithdrawalStatus.DRAFT) throw new BadRequestException('Cannot add non-Draft Withdrawals');

    // restrict creation of draft in case of insufficient balance, does not protect from parallel creation.
    this.checkBalanceForWithdrawalOrThrow(withdrawal, inProgressWithdrawalsAmount);
  }

  checkBalanceForWithdrawalOrThrow(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): void {
    const balance = this.getBalanceFor(withdrawal.asset);
    if (!balance) throw new BadRequestException('No balance to proceed with Withdrawal');

    balance.checkBalanceForWithdrawalOrThrow(withdrawal, inProgressWithdrawalsAmount);
  }

  setRewardRoutes(newRewardRoutes: RewardRoute[]): this {
    this.rewardStrategy.setRewardRoutes(newRewardRoutes);

    return this;
  }

  setStakingFee(feePercent: number): this {
    this.fee = feePercent;

    return this;
  }

  verifyUserAddresses(addresses: string[]): boolean {
    return addresses.every((a) => a === this.withdrawalAddress.address);
  }

  updateBalance(balances: StakingBalances, asset: Asset): this {
    let balance = this.getBalanceFor(asset);
    if (!balance) {
      balance = StakingBalance.create(asset);
      this.balances.push(balance);
    }

    balance.updateBalance(balances);

    return this;
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

  get defaultBalance(): StakingBalance {
    return this.balances[0];
  }

  getBalanceFor(asset?: Asset): StakingBalance | undefined {
    return this.balances.find((b) => b.asset.id === asset?.id);
  }

  //*** HELPER STATIC METHODS ***//

  static calculateFiatReferenceAmount(fiatName: Fiat, assetName: string, assetAmount: number, prices: Price[]): number {
    const price = prices.find((p) => p.source === assetName && p.target === fiatName);

    if (!price) {
      throw new Error(`Cannot calculate reference Fiat amount, ${assetName}/${fiatName} price is missing`);
    }

    if (!price.price) {
      throw new Error(`Cannot calculate reference Fiat amount of ${assetName}/${fiatName} , price value is 0`);
    }

    return Util.round(assetAmount / price.price, 8);
  }
}
