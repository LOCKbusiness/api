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

  @Column({ type: 'float', nullable: true })
  masternodes: number;

  @Column({ type: 'float', nullable: true })
  tvl: number;

  //*** PUBLIC API ***//

  updateAnalytics(averageBalance: number, averageRewards: number, masternodes: number, tvl: number): this {
    this.apr = this.calculateApr(averageBalance, averageRewards);
    this.apy = this.calculateApy(this.apr);
    this.masternodes = masternodes;
    this.tvl = tvl;
    return this;
  }

  static getAprPeriod(): { dateFrom: Date; dateTo: Date } {
    const dateTo = new Date();
    dateTo.setUTCHours(0, 0, 0, 0);
    const dateFrom = Util.daysBefore(GetConfig().staking.aprPeriod, dateTo);

    // TODO: change to return { dateFrom, dateTo } after 28 days
    return { dateFrom: new Date(Math.max(dateFrom.getTime(), new Date('2022-11-03').getTime())), dateTo };
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
