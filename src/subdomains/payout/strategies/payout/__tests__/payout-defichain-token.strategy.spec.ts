import { mock } from 'jest-mock-extended';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { createCustomAsset } from 'src/shared/models/asset/__mocks__/asset.entity.mock';
import { SettingService } from 'src/shared/services/setting.service';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrder } from '../../../entities/payout-order.entity';
import {
  createCustomPayoutOrder,
  createDefaultPayoutOrder,
} from '../../../entities/__mocks__/payout-order.entity.mock';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { DeFiChainTokenStrategy } from '../impl/defichain-token.strategy';

describe('PayoutDeFiChainTokenStrategy', () => {
  let strategy: PayoutDeFiChainTokenStrategyWrapper;

  let notificationService: NotificationService;
  let dexService: DexService;
  let defichainService: PayoutDeFiChainService;
  let payoutOrderRepo: PayoutOrderRepository;
  let assetService: AssetService;
  let settingService: SettingService;

  beforeEach(() => {
    notificationService = mock<NotificationService>();
    dexService = mock<DexService>();
    defichainService = mock<PayoutDeFiChainService>();
    payoutOrderRepo = mock<PayoutOrderRepository>();
    assetService = mock<AssetService>();
    settingService = mock<SettingService>();

    strategy = new PayoutDeFiChainTokenStrategyWrapper(
      notificationService,
      dexService,
      defichainService,
      payoutOrderRepo,
      assetService,
      settingService,
    );
  });

  describe('#groupOrdersByTokens(...)', () => {
    it('returns an instance of Map', () => {
      expect(strategy.groupOrdersByTokenWrapper([])).toBeInstanceOf(Map);
      expect(strategy.groupOrdersByTokenWrapper([createDefaultPayoutOrder()])).toBeInstanceOf(Map);
    });

    it('separates orders in different groups by token', () => {
      const orders = [
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'BTC' }) }),
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'BTC' }) }),
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'ETH' }) }),
      ];

      const groups = strategy.groupOrdersByTokenWrapper(orders);

      expect([...groups.entries()].length).toBe(2);
      expect([...groups.keys()][0]).toBe('BTC');
      expect([...groups.keys()][1]).toBe('ETH');
      expect([...groups.values()][0].length).toBe(2);
      expect([...groups.values()][1].length).toBe(1);
    });

    it('puts orders with same token in one group', () => {
      const orders = [
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'BTC' }) }),
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'BTC' }) }),
        createCustomPayoutOrder({ asset: createCustomAsset({ name: 'BTC' }) }),
      ];

      const groups = strategy.groupOrdersByTokenWrapper(orders);

      expect([...groups.entries()].length).toBe(1);
      expect([...groups.keys()][0]).toBe('BTC');
      expect([...groups.values()][0].length).toBe(3);
    });
  });
});

class PayoutDeFiChainTokenStrategyWrapper extends DeFiChainTokenStrategy {
  constructor(
    notificationService: NotificationService,
    dexService: DexService,
    defichainService: PayoutDeFiChainService,
    payoutOrderRepo: PayoutOrderRepository,
    assetService: AssetService,
    settingService: SettingService,
  ) {
    super(notificationService, dexService, defichainService, payoutOrderRepo, assetService, settingService);
  }

  groupOrdersByTokenWrapper(orders: PayoutOrder[]) {
    return this.groupOrdersByTokens(orders);
  }
}
