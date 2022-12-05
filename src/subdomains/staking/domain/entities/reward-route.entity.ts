import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Staking } from './staking.entity';

@Entity()
@Index(['staking', 'targetAddress.address', 'targetAddress.blockchain', 'targetAsset'], { unique: true })
export class RewardRoute extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.rewardRoutes, { nullable: false })
  staking: Staking;

  @Column({ nullable: false })
  label: string;

  @Column({ type: 'float', nullable: false })
  rewardPercent: number;

  @Column(() => BlockchainAddress)
  targetAddress: BlockchainAddress;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  targetAsset: Asset;

  //*** FACTORY METHODS ***//

  static create(
    staking: Staking,
    label: string,
    rewardPercent: number,
    targetAsset: Asset,
    targetAddress: BlockchainAddress,
  ): RewardRoute {
    const route = new RewardRoute();

    route.staking = staking;
    route.label = label;
    route.rewardPercent = rewardPercent;
    route.targetAsset = targetAsset;
    route.targetAddress = targetAddress;

    return route;
  }

  //*** PUBLIC API ***//

  updateRoute(label: string, rewardPercent: number): this {
    this.label = label;
    this.rewardPercent = rewardPercent;

    return this;
  }
}
