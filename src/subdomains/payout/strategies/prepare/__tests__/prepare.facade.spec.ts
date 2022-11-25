import { mock } from 'jest-mock-extended';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { createCustomAsset } from 'src/shared/models/asset/__mocks__/asset.entity.mock';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { DeFiChainStrategy } from '../impl/defichain.strategy';
import { PrepareStrategiesFacade, PrepareStrategyAlias } from '../prepare.facade';

describe('PrepareStrategiesFacade', () => {
  let defichain: DeFiChainStrategy;

  let facade: PrepareStrategiesFacadeWrapper;

  beforeEach(() => {
    defichain = new DeFiChainStrategy(
      mock<AssetService>(),
      mock<DexService>(),
      mock<PayoutDeFiChainService>(),
      mock<PayoutOrderRepository>(),
    );

    facade = new PrepareStrategiesFacadeWrapper(defichain);
  });

  describe('#constructor(...)', () => {
    it('adds all prepareStrategies to a map', () => {
      expect([...facade.getStrategies().entries()].length).toBe(1);
    });

    it('assigns strategies to all aliases', () => {
      expect([...facade.getStrategies().entries()].length).toBe(Object.values(PrepareStrategyAlias).length);
    });

    it('sets all required prepareStrategies aliases', () => {
      const aliases = [...facade.getStrategies().keys()];

      expect(aliases.includes(PrepareStrategyAlias.DEFICHAIN)).toBe(true);
    });

    it('assigns proper prepareStrategies to aliases', () => {
      expect(facade.getStrategies().get(PrepareStrategyAlias.DEFICHAIN)).toBeInstanceOf(DeFiChainStrategy);
    });
  });

  describe('#getPrepareStrategy(...)', () => {
    describe('getting strategy by Asset', () => {
      it('gets DEFICHAIN strategy for DEFICHAIN', () => {
        const strategy = facade.getPrepareStrategy(createCustomAsset({ blockchain: Blockchain.DEFICHAIN }));

        expect(strategy).toBeInstanceOf(DeFiChainStrategy);
      });

      it('fails to get strategy for non-supported Blockchain', () => {
        const testCall = () =>
          facade.getPrepareStrategy(createCustomAsset({ blockchain: 'NewBlockchain' as Blockchain }));

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No PrepareStrategy found. Alias: undefined');
      });
    });

    describe('getting strategy by Alias', () => {
      it('gets DEFICHAIN strategy', () => {
        const strategy = facade.getPrepareStrategy(PrepareStrategyAlias.DEFICHAIN);

        expect(strategy).toBeInstanceOf(DeFiChainStrategy);
      });

      it('fails to get strategy for non-supported Alias', () => {
        const testCall = () => facade.getPrepareStrategy('NonExistingAlias' as PrepareStrategyAlias);

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No PrepareStrategy found. Alias: NonExistingAlias');
      });
    });
  });
});

class PrepareStrategiesFacadeWrapper extends PrepareStrategiesFacade {
  constructor(defichain: DeFiChainStrategy) {
    super(defichain);
  }

  getStrategies() {
    return this.strategies;
  }
}
