import { mock } from 'jest-mock-extended';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetService } from 'src/shared/services/asset.service';
import { createCustomAsset } from 'src/shared/__tests__/asset.entity.mock';
import { SettingService } from 'src/shared/services/setting.service';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { DeFiChainDfiStrategy } from '../impl/defichain-dfi.strategy';
import { DeFiChainDefaultStrategy } from '../impl/defichain-default.strategy';
import { PayoutStrategiesFacade, PayoutStrategyAlias } from '../payout.facade';

describe('PayoutStrategiesFacade', () => {
  let deFiChainDfi: DeFiChainDfiStrategy;
  let deFiChainDefault: DeFiChainDefaultStrategy;

  let facade: PayoutStrategiesFacadeWrapper;

  beforeEach(() => {
    deFiChainDfi = new DeFiChainDfiStrategy(
      mock<NotificationService>(),
      mock<PayoutDeFiChainService>(),
      mock<PayoutOrderRepository>(),
      mock<AssetService>(),
      mock<SettingService>(),
    );
    deFiChainDefault = new DeFiChainDefaultStrategy(
      mock<NotificationService>(),
      mock<DexService>(),
      mock<PayoutDeFiChainService>(),
      mock<PayoutOrderRepository>(),
      mock<AssetService>(),
      mock<SettingService>(),
    );

    facade = new PayoutStrategiesFacadeWrapper(deFiChainDfi, deFiChainDefault);
  });

  describe('#constructor(...)', () => {
    it('adds all payoutStrategies to a  map', () => {
      expect([...facade.getStrategies().entries()].length).toBe(2);
    });

    it('assigns strategies to all aliases', () => {
      expect([...facade.getStrategies().entries()].length).toBe(Object.values(PayoutStrategyAlias).length);
    });

    it('sets all required payoutStrategies aliases', () => {
      const aliases = [...facade.getStrategies().keys()];

      expect(aliases.includes(PayoutStrategyAlias.DEFICHAIN_DFI)).toBe(true);
      expect(aliases.includes(PayoutStrategyAlias.DEFICHAIN_DEFAULT)).toBe(true);
    });

    it('assigns proper payoutStrategies to aliases', () => {
      expect(facade.getStrategies().get(PayoutStrategyAlias.DEFICHAIN_DFI)).toBeInstanceOf(DeFiChainDfiStrategy);
      expect(facade.getStrategies().get(PayoutStrategyAlias.DEFICHAIN_DEFAULT)).toBeInstanceOf(
        DeFiChainDefaultStrategy,
      );
    });
  });

  describe('#getPayoutStrategy(...)', () => {
    describe('getting strategy by Asset', () => {
      it('gets DEFICHAIN_DFI strategy', () => {
        const strategy = facade.getPayoutStrategy(createCustomAsset({ blockchain: Blockchain.DEFICHAIN, name: 'DFI' }));

        expect(strategy).toBeInstanceOf(DeFiChainDfiStrategy);
      });

      it('gets DEFICHAIN_DEFAULT strategy for DEFICHAIN', () => {
        const strategy = facade.getPayoutStrategy(createCustomAsset({ blockchain: Blockchain.DEFICHAIN, name: 'BTC' }));

        expect(strategy).toBeInstanceOf(DeFiChainDefaultStrategy);
      });

      it('fails to get strategy for non-supported Blockchain', () => {
        const testCall = () =>
          facade.getPayoutStrategy(createCustomAsset({ blockchain: 'NewBlockchain' as Blockchain }));

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No PayoutStrategy found. Alias: undefined');
      });
    });

    describe('getting strategy by Alias', () => {
      it('gets DEFICHAIN_DFI strategy', () => {
        const strategy = facade.getPayoutStrategy(PayoutStrategyAlias.DEFICHAIN_DFI);

        expect(strategy).toBeInstanceOf(DeFiChainDfiStrategy);
      });

      it('gets DEFICHAIN_DEFAULT strategy', () => {
        const strategy = facade.getPayoutStrategy(PayoutStrategyAlias.DEFICHAIN_DEFAULT);

        expect(strategy).toBeInstanceOf(DeFiChainDefaultStrategy);
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
  constructor(deFiChainDfi: DeFiChainDfiStrategy, deFiChainDefault: DeFiChainDefaultStrategy) {
    super(deFiChainDfi, deFiChainDefault);
  }

  getStrategies() {
    return this.strategies;
  }
}
