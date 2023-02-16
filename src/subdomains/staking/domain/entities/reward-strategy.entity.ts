import { BadRequestException } from '@nestjs/common';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity, OneToMany } from 'typeorm';
import { RewardRoute } from './reward-route.entity';
import { Staking } from './staking.entity';

@Entity()
export class RewardStrategy extends IEntity {
  @Column({ type: 'int', nullable: false, unique: true })
  userId: number;

  @OneToMany(() => Staking, (staking) => staking.rewardStrategy)
  stakings: Staking[];

  @OneToMany(() => RewardRoute, (route) => route.strategy, { eager: true, cascade: true })
  rewardRoutes: RewardRoute[];

  // --- FACTORY METHODS --- //

  static create(userId: number): RewardStrategy {
    const strategy = new RewardStrategy();

    strategy.userId = userId;
    strategy.rewardRoutes = this.createDefaultRewardRoutes();

    return strategy;
  }

  private static createDefaultRewardRoutes(): RewardRoute[] {
    return [RewardRoute.create('Reinvest', 1, null, null)];
  }

  // --- PUBLIC API --- //

  setRewardRoutes(newRewardRoutes: RewardRoute[]): this {
    this.validateRewardDistribution(newRewardRoutes);
    this.validateDuplicatedRoutes(newRewardRoutes);

    this.updateRewardRoutes(newRewardRoutes);

    return this;
  }

  // --- GETTERS --- //
  get activeRewardRoutes(): RewardRoute[] {
    return this.rewardRoutes.filter((r) => r.targetAddress != null && r.rewardPercent !== 0);
  }

  // --- HELPER METHODS --- //

  private validateRewardDistribution(newRewardRoutes: RewardRoute[]): void {
    const totalDistribution = Util.round(Util.sumObj<RewardRoute>(newRewardRoutes, 'rewardPercent'), 2);

    if (totalDistribution > 1) {
      throw new BadRequestException(
        `Cannot create reward strategy. Total reward distribution must be less than 100%, instead distributed total of ${Util.round(
          totalDistribution * 100,
          2,
        )}%`,
      );
    }
  }

  private validateDuplicatedRoutes(newRewardRoutes: RewardRoute[]): void {
    newRewardRoutes.forEach((route) => {
      const duplicatedRoute = this.findDuplicatedRoute(route, newRewardRoutes);

      if (duplicatedRoute) {
        throw new BadRequestException(
          `Cannot create reward strategy. Provided duplicated route for asset ${duplicatedRoute.targetAsset.name} and address ${duplicatedRoute.targetAddress.address}`,
        );
      }
    });
  }

  private findDuplicatedRoute(currentRoute: RewardRoute, allRewardRoutes: RewardRoute[]): RewardRoute | null {
    return allRewardRoutes.some((r, index) => allRewardRoutes.findIndex((_r) => _r.isEqual(r)) !== index)
      ? currentRoute
      : null;
  }

  private updateRewardRoutes(newRewardRoutes: RewardRoute[]): void {
    this.resetExistingRoutes();

    newRewardRoutes.forEach((newRoute) => {
      const existingRoute = this.rewardRoutes.find((r) => r.isEqual(newRoute));

      if (existingRoute) {
        existingRoute.updateRoute(newRoute.label, newRoute.rewardPercent);
        return;
      }

      this.rewardRoutes.push(newRoute);
    });

    // update reinvest route
    const totalDistribution = Util.round(Util.sumObj<RewardRoute>(this.rewardRoutes, 'rewardPercent'), 2);
    const reinvestRoute = this.rewardRoutes.find((rr) => rr.isReinvest);
    reinvestRoute.rewardPercent = Util.round(1 - totalDistribution, 2);
  }

  private resetExistingRoutes(): void {
    this.rewardRoutes.forEach((route) => (route.rewardPercent = 0));
  }
}
