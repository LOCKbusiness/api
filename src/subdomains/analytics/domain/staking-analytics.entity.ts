import { GetConfig } from 'src/config/config';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class StakingAnalytics extends IEntity {
  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @Column({ nullable: false })
  strategy: StakingStrategy;

  @Column({ type: 'float', nullable: true })
  apr: number;

  @Column({ type: 'float', nullable: true })
  apy: number;

  @Column({ type: 'integer', nullable: true })
  operatorCount: number;

  @Column({ type: 'float', nullable: true })
  tvl: number;

  //*** PUBLIC API ***//

  updateAnalytics(averageBalance: number, averageRewards: number, operatorCount: number, tvl: number): this {
    const apr = this.calculateApr(averageBalance, averageRewards);
    const apy = this.calculateApy(apr);

    this.apr = this.strategy === StakingStrategy.MASTERNODE ? apr : this.apr;
    this.apy = this.strategy === StakingStrategy.MASTERNODE ? apy : this.apy;
    this.operatorCount = operatorCount;
    this.tvl = tvl;

    console.log(`Updated analytics for ${this.asset.name} ${this.strategy}: APR: ${apr}%, APY: ${apy}%`);

    return this;
  }

  static getAprPeriod(): { dateFrom: Date; dateTo: Date } {
    const dateTo = new Date();
    dateTo.setUTCHours(0, 0, 0, 0);
    const dateFrom = Util.daysBefore(GetConfig().staking.aprPeriod, dateTo);

    return { dateFrom, dateTo };
  }

  //*** HELPER METHODS ***//

  private calculateApr(averageBalance: number, averageRewards: number): number {
    if (averageBalance === 0) return 0;

    const apr = this.getApr(averageRewards, averageBalance);

    return Util.round(apr, 3);
  }

  private calculateApy(apr: number): number {
    const apy = Math.pow(1 + apr / 365, 365) - 1;

    return Util.round(apy, 3);
  }

  private getApr(interest: number, collateral: number): number {
    if (collateral === 0) return 0;

    return (interest / collateral) * 365;
  }
}
