import { Asset } from 'src/shared/models/asset/asset.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { IEntity } from 'src/shared/models/entity';
import { BadRequestException } from '@nestjs/common';
import { Staking } from './staking.entity';
import { StakingBalances } from '../../application/services/staking.service';

@Entity()
@Index((sb: StakingBalance) => [sb.staking, sb.asset], { unique: true })
export class StakingBalance extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.balances, { nullable: false })
  staking: Staking;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  balance: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  stageOneBalance: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  stageTwoBalance: number;

  //*** FACTORY METHODS ***//

  static create(asset: Asset): StakingBalance {
    const stakingBalance = new StakingBalance();
    stakingBalance.asset = asset;
    return stakingBalance;
  }

  //*** PUBLIC API ***//

  updateBalance({ currentBalance, stageOneBalance, stageTwoBalance }: StakingBalances): this {
    this.balance = currentBalance;
    this.stageOneBalance = stageOneBalance;
    this.stageTwoBalance = stageTwoBalance;

    return this;
  }

  checkBalanceForWithdrawalOrThrow(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): void {
    if (!this.isEnoughBalanceForWithdrawal(withdrawal, inProgressWithdrawalsAmount)) {
      throw new BadRequestException('Not sufficient staking balance to proceed with Withdrawal');
    }
  }

  //*** HELPER METHODS ***//

  private isEnoughBalanceForWithdrawal(withdrawal: Withdrawal, inProgressWithdrawalsAmount: number): boolean {
    const currentBalance = this.balance - inProgressWithdrawalsAmount;

    return currentBalance >= withdrawal.amount;
  }
}
