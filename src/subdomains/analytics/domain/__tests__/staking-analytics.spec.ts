import { Asset } from 'src/shared/models/asset/asset.entity';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { StakingAnalytics } from '../staking-analytics.entity';

describe('StakingAnalytics', () => {
  describe('#getAprPeriod(...)', () => {
    it('returns object with two dates', () => {
      const dates = StakingAnalytics.getAprPeriod();

      expect(dates.dateFrom).toBeInstanceOf(Date);
      expect(dates.dateTo).toBeInstanceOf(Date);
    });

    it('returns toDate as today Date', () => {
      const today = new Date();
      const dates = StakingAnalytics.getAprPeriod();

      expect(dates.dateTo.getDate()).toBe(today.getDate());
      expect(dates.dateTo.getMonth()).toBe(today.getMonth());
      expect(dates.dateTo.getFullYear()).toBe(today.getFullYear());
    });
  });

  describe('#updateAnalytics(...)', () => {
    it('sets operatorCount and tvl', () => {
      const operatorCount = 3;
      const tvl = 100;

      const analytics = new StakingAnalytics();
      analytics.strategy = StakingStrategy.MASTERNODE;
      analytics.asset = { name: 'DFI' } as Asset;

      const updatedAnalytics = analytics.updateAnalytics(operatorCount, tvl);

      expect(updatedAnalytics.operatorCount).toBe(3);
      expect(updatedAnalytics.tvl).toBe(100);
    });
  });
});
