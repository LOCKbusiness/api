import { Injectable } from '@nestjs/common';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { Asset } from 'src/shared/entities/asset.entity';
import { AssetService } from 'src/shared/services/asset.service';
import { SettingService } from 'src/shared/services/setting.service';
import { DexService } from 'src/subdomains/dex/services/dex.service';
import { PayoutOrderContext, PayoutOrder } from '../../../entities/payout-order.entity';
import { FeeResult } from '../../../interfaces';
import { PayoutOrderRepository } from '../../../repositories/payout-order.repository';
import { PayoutGroup } from '../../../services/base/payout-jellyfish.service';
import { PayoutDeFiChainService } from '../../../services/payout-defichain.service';
import { JellyfishStrategy } from './base/jellyfish.strategy';

type TokenName = string;

@Injectable()
export class DeFiChainDefaultStrategy extends JellyfishStrategy {
  constructor(
    notificationService: NotificationService,
    private readonly dexService: DexService,
    protected readonly jellyfishService: PayoutDeFiChainService,
    protected readonly payoutOrderRepo: PayoutOrderRepository,
    protected readonly assetService: AssetService,
    protected readonly settingService: SettingService,
  ) {
    super(notificationService, payoutOrderRepo, jellyfishService, settingService);
  }

  async estimateFee(_quantityOfTransactions: number): Promise<FeeResult> {
    return { asset: await this.feeAsset(), amount: 0 };
  }

  protected async doPayoutForContext(context: PayoutOrderContext, orders: PayoutOrder[]): Promise<void> {
    const tokenGroups = this.groupOrdersByTokens(orders);

    for (const [tokenName, tokenGroup] of tokenGroups.entries()) {
      const payoutGroups = this.createPayoutGroups(tokenGroup, 10);

      for (const group of payoutGroups) {
        try {
          if (group.length === 0) {
            continue;
          }

          console.info(`Paying out ${group.length} token orders(s). Order ID(s): ${group.map((o) => o.id)}`);

          await this.checkUtxoForGroup(group);
          await this.sendToken(context, group, tokenName);
        } catch (e) {
          console.error(
            `Error in paying out a group of ${group.length} token orders(s). Order ID(s): ${group.map((o) => o.id)}`,
          );
          // continue with next group in case payout failed
          continue;
        }
      }
    }
  }

  protected groupOrdersByTokens(orders: PayoutOrder[]): Map<TokenName, PayoutOrder[]> {
    const groups = new Map<TokenName, PayoutOrder[]>();

    orders.forEach((order) => {
      const existingGroup = groups.get(order.asset.name);

      if (existingGroup) {
        existingGroup.push(order);
      } else {
        groups.set(order.asset.name, [order]);
      }
    });

    return groups;
  }

  private async checkUtxoForGroup(orders: PayoutOrder[]): Promise<void> {
    if ((await this.settingService.get('check-min-utxo-on-payout')) !== 'on') return;

    for (const order of orders) {
      if (this.isEligibleForMinimalUtxo(order.destinationAddress)) {
        await this.checkUtxo(order.destinationAddress);
      }
    }
  }

  private isEligibleForMinimalUtxo(address: string): boolean {
    return this.jellyfishService.isLightWalletAddress(address);
  }

  private async checkUtxo(address: string): Promise<void> {
    const utxo = await this.jellyfishService.getUtxoForAddress(address);

    if (!utxo) {
      await this.dexService.transferMinimalUtxo(address);
    }
  }

  protected dispatchPayout(context: PayoutOrderContext, payout: PayoutGroup, outputAsset: string): Promise<string> {
    return this.jellyfishService.sendTokenToMany(context, payout, outputAsset);
  }

  protected getFeeAsset(): Promise<Asset> {
    return this.assetService.getDfiCoin();
  }

  private async sendToken(context: PayoutOrderContext, orders: PayoutOrder[], outputAsset: string): Promise<void> {
    await this.send(context, orders, outputAsset);
  }
}
