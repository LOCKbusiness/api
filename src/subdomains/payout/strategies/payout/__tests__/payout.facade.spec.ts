import { mock } from 'jest-mock-extended';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetType } from 'src/shared/models/asset/asset.entity';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { createCustomAsset } from 'src/shared/models/asset/__mocks__/asset.entity.mock';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { DeFiChainCoinStrategy } from '../impl/defichain-coin.strategy';
import { DeFiChainTokenStrategy } from '../impl/defichain-token.strategy';
import { PayoutStrategiesFacade, PayoutStrategyAlias } from '../payout.facade';

describe('PayoutStrategiesFacade', () => {
  let deFiChainCoin: DeFiChainCoinStrategy;
  let deFiChainToken: DeFiChainTokenStrategy;

  let facade: PayoutStrategiesFacadeWrapper;

  beforeEach(() => {
    deFiChainCoin = new DeFiChainCoinStrategy(
      mock<NotificationService>(),
      mock<PayoutDeFiChainService>(),
      mock<PayoutOrderRepository>(),
      mock<AssetService>(),
    );
    deFiChainToken = new DeFiChainTokenStrategy(
      mock<NotificationService>(),
      mock<DexService>(),
      mock<PayoutDeFiChainService>(),
      mock<PayoutOrderRepository>(),
      mock<AssetService>(),
    );

    facade = new PayoutStrategiesFacadeWrapper(deFiChainCoin, deFiChainToken);
  });

  describe('#constructor(...)', () => {
    it('adds all payoutStrategies to a map', () => {
      expect([...facade.getStrategies().entries()].length).toBe(2);
    });

    it('assigns strategies to all aliases', () => {
      expect([...facade.getStrategies().entries()].length).toBe(Object.values(PayoutStrategyAlias).length);
    });

    it('sets all required payoutStrategies aliases', () => {
      const aliases = [...facade.getStrategies().keys()];

      expect(aliases.includes(PayoutStrategyAlias.DEFICHAIN_COIN)).toBe(true);
      expect(aliases.includes(PayoutStrategyAlias.DEFICHAIN_TOKEN)).toBe(true);
    });

    it('assigns proper payoutStrategies to aliases', () => {
      expect(facade.getStrategies().get(PayoutStrategyAlias.DEFICHAIN_COIN)).toBeInstanceOf(DeFiChainCoinStrategy);
      expect(facade.getStrategies().get(PayoutStrategyAlias.DEFICHAIN_TOKEN)).toBeInstanceOf(DeFiChainTokenStrategy);
    });
  });

  describe('#getPayoutStrategy(...)', () => {
    describe('getting strategy by Asset', () => {
      it('gets DEFICHAIN_COIN strategy', () => {
        const strategy = facade.getPayoutStrategy(
          createCustomAsset({ blockchain: Blockchain.DEFICHAIN, type: AssetType.COIN }),
        );

        expect(strategy).toBeInstanceOf(DeFiChainCoinStrategy);
      });

      it('gets DEFICHAIN_TOKEN strategy for DEFICHAIN', () => {
        const strategy = facade.getPayoutStrategy(
          createCustomAsset({ blockchain: Blockchain.DEFICHAIN, type: AssetType.TOKEN }),
        );

        expect(strategy).toBeInstanceOf(DeFiChainTokenStrategy);
      });

      it('fails to get strategy for non-supported Blockchain', () => {
        const testCall = () =>
          facade.getPayoutStrategy(createCustomAsset({ blockchain: 'NewBlockchain' as Blockchain }));

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No PayoutStrategy found. Alias: undefined');
      });
    });

    describe('getting strategy by Alias', () => {
      it('gets DEFICHAIN_COIN strategy', () => {
        const strategy = facade.getPayoutStrategy(PayoutStrategyAlias.DEFICHAIN_COIN);

        expect(strategy).toBeInstanceOf(DeFiChainCoinStrategy);
      });

      it('gets DEFICHAIN_TOKEN strategy', () => {
        const strategy = facade.getPayoutStrategy(PayoutStrategyAlias.DEFICHAIN_TOKEN);

        expect(strategy).toBeInstanceOf(DeFiChainTokenStrategy);
      });

      it('fails to get strategy for non-supported Alias', () => {
        const testCall = () => facade.getPayoutStrategy('NonExistingAlias' as PayoutStrategyAlias);

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No PayoutStrategy found. Alias: NonExistingAlias');
      });
    });
  });
});

class PayoutStrategiesFacadeWrapper extends PayoutStrategiesFacade {
  constructor(deFiChainCoin: DeFiChainCoinStrategy, deFiChainToken: DeFiChainTokenStrategy) {
    super(deFiChainCoin, deFiChainToken);
  }

  getStrategies() {
    return this.strategies;
  }
}
