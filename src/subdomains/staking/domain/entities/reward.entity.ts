import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { RewardStatus } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Reward extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.rewards, { eager: true, nullable: true })
  staking: Staking;

  @Column({ length: 256, nullable: false })
  status: RewardStatus;

  //*** NATIVE ASSET ***//

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  //*** REINVEST PROPS ***//

  @Column({ nullable: true })
  reinvestTxId: string;

  @Column({ nullable: true })
  reinvestOutputDate: Date;

  //*** REFERENCE DATA ***//

  @Column({ type: 'float', nullable: false, default: 0 })
  fee: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  amountEur: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  amountUsd: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  amountChf: number;

  //*** FACTORY METHODS ***//

  static create(
    staking: Staking,
    amount: number,
    reinvestTxId: string,
    reinvestOutputDate: Date,
    fee: number,
    amountEur: number,
    amountUsd: number,
    amountChf: number,
  ): Reward {
    const reward = new Reward();

    reward.staking = staking;
    reward.status = RewardStatus.CONFIRMED;

    reward.asset = staking.asset;
    reward.amount = amount;
    reward.reinvestTxId = reinvestTxId;
    reward.reinvestOutputDate = reinvestOutputDate;

    reward.fee = fee;
    reward.amountEur = amountEur;
    reward.amountUsd = amountUsd;
    reward.amountChf = amountChf;

    return reward;
  }
}
