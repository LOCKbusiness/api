import { Asset } from 'src/shared/entities/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/entities/entity';
import { StakingStatus } from '../enums';

@Entity()
export class Staking extends IEntity {
  @Column({ length: 256, nullable: false })
  status: StakingStatus;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  balance: number;

  @OneToMany(() => Deposit, (deposit) => deposit.staking, { cascade: true })
  deposits: Deposit[];

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.staking, { cascade: true })
  withdrawals: Withdrawal[];

  @OneToMany(() => Reward, (reward) => reward.staking, { cascade: true })
  rewards: Reward[];

  //*** FACTORY METHODS ***//

  static create(): Staking {
    const stake = new Staking();

    return stake;
  }

  //*** PUBLIC API ***//

  deposit(): this {
    return this;
  }

  withdraw(): this {
    return this;
  }

  addReward(): this {
    return this;
  }

  distributeReward(): this {
    return this;
  }

  //*** GETTERS ***//

  getBalance(): number {
    // TODO - might need to diff between pending and real balance through params
    return this.balance;
  }
}
