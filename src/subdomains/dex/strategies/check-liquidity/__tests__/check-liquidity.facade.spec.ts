import { mock } from 'jest-mock-extended';
import { BehaviorSubject } from 'rxjs';
import { AssetCategory } from 'src/shared/entities/asset.entity';
import { DexDeFiChainService } from '../../../services/dex-defichain.service';
import { CheckLiquidityStrategies, CheckLiquidityAlias } from '../check-liquidity.facade';
import { DeFiChainDefaultStrategy } from '../impl/defichain-default.strategy';
import { DeFiChainPoolPairStrategy } from '../impl/defichain-poolpair.strategy';
import { AssetService } from 'src/shared/services/asset.service';
import { PurchaseLiquidityStrategies } from '../../purchase-liquidity/purchase-liquidity.facade';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { createCustomAsset } from 'src/shared/__tests__/asset.entity.mock';

describe('CheckLiquidityStrategies', () => {
  let nodeService: NodeService;

  let deFiChainPoolPair: DeFiChainPoolPairStrategy;
  let deFiChainDefault: DeFiChainDefaultStrategy;

  let facade: CheckLiquidityStrategiesWrapper;

  beforeEach(() => {
    nodeService = mock<NodeService>();
    jest.spyOn(nodeService, 'getConnectedNode').mockImplementation(() => new BehaviorSubject(null));

    deFiChainPoolPair = new DeFiChainPoolPairStrategy(mock<AssetService>(), mock<DexDeFiChainService>());
    deFiChainDefault = new DeFiChainDefaultStrategy(
      mock<AssetService>(),
      mock<DexDeFiChainService>(),
      mock<PurchaseLiquidityStrategies>(),
    );

    facade = new CheckLiquidityStrategiesWrapper(deFiChainDefault, deFiChainPoolPair);
  });

  describe('#constructor(...)', () => {
    it('adds all checkLiquidityStrategies to a map', () => {
      expect([...facade.getStrategies().entries()].length).toBe(2);
    });

    it('assigns strategies to all aliases', () => {
      expect([...facade.getStrategies().entries()].length).toBe(Object.values(CheckLiquidityAlias).length);
    });

    it('sets all required checkLiquidityStrategies aliases', () => {
      const aliases = [...facade.getStrategies().keys()];

      expect(aliases.includes(CheckLiquidityAlias.DEFICHAIN_POOL_PAIR)).toBe(true);
      expect(aliases.includes(CheckLiquidityAlias.DEFICHAIN_DEFAULT)).toBe(true);
    });

    it('assigns proper checkLiquidityStrategies to aliases', () => {
      expect(facade.getStrategies().get(CheckLiquidityAlias.DEFICHAIN_POOL_PAIR)).toBeInstanceOf(
        DeFiChainPoolPairStrategy,
      );
      expect(facade.getStrategies().get(CheckLiquidityAlias.DEFICHAIN_DEFAULT)).toBeInstanceOf(
        DeFiChainDefaultStrategy,
      );
    });
  });

  describe('#getCheckLiquidityStrategy(...)', () => {
    describe('getting strategy by Asset', () => {
      it('gets DEFICHAIN_POOL_PAIR strategy for DEFICHAIN', () => {
        const strategy = facade.getCheckLiquidityStrategy(
          createCustomAsset({ blockchain: Blockchain.DEFICHAIN, category: AssetCategory.POOL_PAIR }),
        );

        expect(strategy).toBeInstanceOf(DeFiChainPoolPairStrategy);
      });

      it('gets DEFICHAIN_DEFAULT strategy for DEFICHAIN', () => {
        const strategyCrypto = facade.getCheckLiquidityStrategy(
          createCustomAsset({ blockchain: Blockchain.DEFICHAIN, category: AssetCategory.CRYPTO }),
        );

        expect(strategyCrypto).toBeInstanceOf(DeFiChainDefaultStrategy);

        const strategyStock = facade.getCheckLiquidityStrategy(
          createCustomAsset({ blockchain: Blockchain.DEFICHAIN, category: AssetCategory.STOCK }),
        );

        expect(strategyStock).toBeInstanceOf(DeFiChainDefaultStrategy);
      });

      it('fails to get strategy for non-supported Blockchain', () => {
        const testCall = () =>
          facade.getCheckLiquidityStrategy(createCustomAsset({ blockchain: 'NewBlockchain' as Blockchain }));

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No CheckLiquidityStrategy found. Alias: undefined');
      });
    });

    describe('getting strategy by CheckLiquidityAlias', () => {
      it('gets DEFICHAIN_POOL_PAIR strategy', () => {
        const strategy = facade.getCheckLiquidityStrategy(CheckLiquidityAlias.DEFICHAIN_POOL_PAIR);

        expect(strategy).toBeInstanceOf(DeFiChainPoolPairStrategy);
      });

      it('gets DEFICHAIN_DEFAULT strategy', () => {
        const strategyCrypto = facade.getCheckLiquidityStrategy(CheckLiquidityAlias.DEFICHAIN_DEFAULT);

        expect(strategyCrypto).toBeInstanceOf(DeFiChainDefaultStrategy);
      });

      it('fails to get strategy for non-supported CheckLiquidityAlias', () => {
        const testCall = () =>
          facade.getCheckLiquidityStrategy('NonExistingCheckLiquidityAlias' as CheckLiquidityAlias);

        expect(testCall).toThrow();
        expect(testCall).toThrowError('No CheckLiquidityStrategy found. Alias: NonExistingCheckLiquidityAlias');
      });
    });
  });
});

class CheckLiquidityStrategiesWrapper extends CheckLiquidityStrategies {
  constructor(deFiChainDefault: DeFiChainDefaultStrategy, deFiChainPoolPair: DeFiChainPoolPairStrategy) {
    super(deFiChainDefault, deFiChainPoolPair);
  }

  getStrategies() {
    return this.strategies;
  }
}
