import { StakingAnalytics } from '../staking-analytics.entity';

describe('StakingAnalytics', () => {
  describe('#getAPRPeriod(...)', () => {
    it('returns object with two dates', () => {
      const dates = StakingAnalytics.getAPRPeriod();

      expect(dates.dateFrom).toBeInstanceOf(Date);
      expect(dates.dateTo).toBeInstanceOf(Date);
    });

    it('returns toDate as today Date', () => {
      const today = new Date();
      const dates = StakingAnalytics.getAPRPeriod();

      expect(dates.dateTo.getDate()).toBe(today.getDate());
      expect(dates.dateTo.getMonth()).toBe(today.getMonth());
      expect(dates.dateTo.getFullYear()).toBe(today.getFullYear());
    });
  });

  describe('#updateAnalytics(...)', () => {
    it('calculates APR and APY as average for 28 days', () => {
      const averageBalance = 100;
      const totalReward = 2.8;

      const analytics = new StakingAnalytics();

      const updatedAnalytics = analytics.updateAnalytics(averageBalance, totalReward);

      expect(updatedAnalytics.apr).toBe(0.365);
      expect(updatedAnalytics.apy).toBe(0.44);
    });
  });
});
