import { Asset } from 'src/shared/entities/asset.entity';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { StakingAnalytics } from '../staking-analytics.entity';

describe('StakingAnalytics', () => {
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
