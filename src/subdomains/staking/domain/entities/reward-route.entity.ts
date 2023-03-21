import { Asset } from 'src/shared/entities/asset.entity';
import { BlockchainAddress } from 'src/shared/entities/blockchain-address';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { RewardStrategy } from './reward-strategy.entity';

@Entity()
@Index((r: RewardRoute) => [r.strategy, r.targetAddress.address, r.targetAddress.blockchain, r.targetAsset], {
  unique: true,
})
export class RewardRoute extends IEntity {
  @ManyToOne(() => RewardStrategy, (strategy) => strategy.rewardRoutes, { nullable: false })
  strategy: RewardStrategy;

  @Column({ nullable: true })
  label?: string;

  @Column({ type: 'float', nullable: false })
  rewardPercent: number;

  @Column(() => BlockchainAddress)
  targetAddress: BlockchainAddress;

  @ManyToOne(() => Asset, { eager: true, nullable: true })
  targetAsset: Asset;

  // --- FACTORY METHODS --- //

  static create(
    label: string,
    rewardPercent: number,
    targetAsset: Asset,
    targetAddress: BlockchainAddress,
  ): RewardRoute {
    const route = new RewardRoute();

    route.label = label;
    route.rewardPercent = rewardPercent;
    route.targetAddress = targetAddress;
    route.targetAsset = targetAsset;

    return route;
  }

  // --- PUBLIC API --- //

  isEqual(route: RewardRoute): boolean {
    if (this.isDefault && route.isDefault) {
      return true;
    } else if (!this.isDefault && !route.isDefault) {
      return this.targetAsset.id === route.targetAsset.id && this.targetAddress.isEqual(route.targetAddress);
    }

    return false;
  }

  updateRoute(label: string, rewardPercent: number): this {
    this.label = label;
    this.rewardPercent = rewardPercent;

    return this;
  }

  // --- GETTERS --- //

  get isDefault(): boolean {
    return this.targetAddress.address == null && this.targetAsset == null;
  }
}
