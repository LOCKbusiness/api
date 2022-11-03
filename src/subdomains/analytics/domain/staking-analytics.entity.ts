import { GetConfig } from 'src/config/config';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { Column, Entity } from 'typeorm';

@Entity()
export class StakingAnalytics extends IEntity {
  @Column({ type: 'float', nullable: true })
  apr: number;

  @Column({ type: 'float', nullable: true })
  apy: number;

  //*** PUBLIC API ***//

  updateAnalytics(averageBalance: number, totalReward: number): this {
    this.apr = this.calculateAPR(averageBalance, totalReward);
    this.apy = this.calculateAPY(this.apr);

    return this;
  }

  static getAPRPeriod(): { dateFrom: Date; dateTo: Date } {
    const dateTo = new Date();
    dateTo.setUTCHours(0, 0, 0, 0);
    const dateFrom = Util.daysBefore(GetConfig().staking.aprPeriod, dateTo);

    // TODO: change to return { dateFrom, dateTo } after 28 days
    return { dateFrom: new Date(Math.max(dateFrom.getTime(), new Date('2022-11-03').getTime())), dateTo };
  }

  //*** HELPER METHODS ***//

  private calculateAPR(averageBalance: number, totalReward: number): number {
    if (averageBalance === 0) return 0;

    const apr = this.getApr(totalReward / GetConfig().staking.aprPeriod, averageBalance);

    return Util.round(apr, 3);
  }

  private calculateAPY(apr: number): number {
    const apy = Math.pow(1 + apr / 365, 365) - 1;

    return Util.round(apy, 3);
  }

  private getApr(interest: number, collateral: number): number {
    if (collateral === 0) return 0;

    return (interest / collateral) * 365;
  }
}
