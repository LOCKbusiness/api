import { GetConfig } from 'src/config/config';
import { Util } from 'src/shared/util';

export class StakingAnalytics {
  //*** PUBLIC API ***//

  static getAPRPeriod(): { dateFrom: Date; dateTo: Date } {
    const dateTo = new Date();
    dateTo.setUTCHours(0, 0, 0, 0);
    const dateFrom = Util.daysBefore(GetConfig().staking.aprPeriod, dateTo);

    return { dateFrom, dateTo };
  }

  static calculateAPR(averageBalance: number, totalReward: number): number {
    if (averageBalance === 0) return 0;

    const apr = this.getApr(totalReward / GetConfig().staking.aprPeriod, averageBalance);

    return Util.round(apr, 3);
  }

  static calculateAPY(apr: number): number {
    const apy = Math.pow(1 + apr / 365, 365) - 1;

    return Util.round(apy, 3);
  }

  //*** HELPER METHODS ***//

  private static getApr(interest: number, collateral: number): number {
    if (collateral === 0) return 0;

    return (interest / collateral) * 365;
  }
}
