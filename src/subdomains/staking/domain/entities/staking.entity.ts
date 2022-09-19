import { Asset } from 'src/shared/entities/asset.entity';
import { Deposit } from './deposit.entity';
import { Reward } from './reward.entity';
import { Withdrawal } from './withdrawal.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IEntity } from 'src/shared/entities/entity';

@Entity()
export class Staking extends IEntity {
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

  static create(): Staking {
    const stake = new Staking();

    return stake;
  }

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
}
