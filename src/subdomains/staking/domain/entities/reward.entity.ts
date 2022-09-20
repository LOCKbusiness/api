import { Asset } from 'src/shared/entities/asset.entity';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { RewardStatus, StakingAddressPurposes } from '../enums';
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

  @Column({ type: 'float', nullable: false, default: 1 })
  reinvestShare: number;

  @Column({ type: 'float', nullable: false, default: 0 })
  reinvestAmount: number;

  //*** PAYOUT PROPS ***//

  @Column({ type: 'float', nullable: false, default: 0 })
  payoutShare: number;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  payoutAsset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  payoutAmount: number;

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: true })
  payoutAddress: BlockchainAddress<StakingAddressPurposes.REWARD_PAYOUT>;

  //*** FACTORY METHODS ***//

  static create(staking: Staking, amount: number): Reward {
    const reward = new Reward();

    reward.staking = staking;
    reward.status = RewardStatus.CREATED;

    reward.asset = staking.asset;
    reward.amount = amount;

    reward.reinvestShare = 1;
    reward.reinvestAmount = amount;

    reward.payoutShare = 0;
    reward.payoutAsset = staking.asset;
    reward.payoutAmount = 0;
    reward.payoutAddress = null;

    return reward;
  }
}
