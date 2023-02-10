import { Asset } from 'src/shared/models/asset/asset.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Staking } from './staking.entity';

@Entity()
@Index((r: RewardRoute) => [r.staking, r.targetAddress.address, r.targetAddress.blockchain, r.targetAsset], {
  unique: true,
})
export class RewardRoute extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.rewardRoutes, { nullable: false })
  staking: Staking;

  @Column({ nullable: true })
  label?: string;

  @Column({ type: 'float', nullable: false })
  rewardPercent: number;

  @Column(() => BlockchainAddress)
  targetAddress: BlockchainAddress;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  targetAsset: Asset;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  rewardAsset: Asset;

  //*** FACTORY METHODS ***//

  static create(
    staking: Staking,
    label: string,
    rewardPercent: number,
    targetAsset: Asset,
    targetAddress: BlockchainAddress,
    rewardAsset: Asset,
  ): RewardRoute {
    const route = new RewardRoute();

    route.staking = staking;
    route.label = label;
    route.rewardPercent = rewardPercent;
    route.targetAsset = targetAsset;
    route.targetAddress = targetAddress;
    route.rewardAsset = rewardAsset;

    return route;
  }

  //*** PUBLIC API ***//

  isEqual(newRoute: RewardRoute): boolean {
    return (
      this.targetAsset.id === newRoute.targetAsset.id &&
      this.targetAddress.isEqual(newRoute.targetAddress) &&
      this.rewardAsset.isEqual(newRoute.rewardAsset)
    );
  }

  updateRoute(label: string, rewardPercent: number): this {
    this.label = label;
    this.rewardPercent = rewardPercent;

    return this;
  }
}
