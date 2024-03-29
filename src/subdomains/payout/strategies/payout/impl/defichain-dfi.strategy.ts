import { Injectable } from '@nestjs/common';
import { PayoutOrderContext, PayoutOrder } from '../../../entities/payout-order.entity';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutGroup } from '../../../services/base/payout-jellyfish.service';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { JellyfishStrategy } from './base/jellyfish.strategy';
import { AssetService } from 'src/shared/services/asset.service';
import { FeeResult } from '../../../interfaces';
import { Asset } from 'src/shared/entities/asset.entity';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { SettingService } from 'src/shared/services/setting.service';

@Injectable()
export class DeFiChainDfiStrategy extends JellyfishStrategy {
  constructor(
    notificationService: NotificationService,
    protected readonly deFiChainService: PayoutDeFiChainService,
    protected readonly payoutOrderRepo: PayoutOrderRepository,
    protected readonly assetService: AssetService,
    protected readonly settingService: SettingService,
  ) {
    super(notificationService, payoutOrderRepo, deFiChainService, settingService);
  }

  async estimateFee(_quantityOfTransactions: number): Promise<FeeResult> {
    return { asset: await this.feeAsset(), amount: 0 };
  }

  protected async doPayoutForContext(context: PayoutOrderContext, orders: PayoutOrder[]): Promise<void> {
    const payoutGroups = this.createPayoutGroups(orders, 100);

    for (const group of payoutGroups) {
      try {
        if (group.length === 0) {
          continue;
        }

        console.info(`Paying out ${group.length} DFI orders(s). Order ID(s): ${group.map((o) => o.id)}`);

        await this.sendDFI(context, group);
      } catch (e) {
        console.error(
          `Error in paying out a group of ${group.length} DFI orders(s). Order ID(s): ${group.map((o) => o.id)}`,
        );
        // continue with next group in case payout failed
        continue;
      }
    }
  }

  protected dispatchPayout(context: PayoutOrderContext, payout: PayoutGroup): Promise<string> {
    return this.deFiChainService.sendUtxoToMany(context, payout);
  }

  protected getFeeAsset(): Promise<Asset> {
    return this.assetService.getDfiCoin();
  }

  private async sendDFI(context: PayoutOrderContext, orders: PayoutOrder[]): Promise<void> {
    await this.send(context, orders, 'DFI');
  }
}
