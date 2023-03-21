import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { AssetCategory } from 'src/shared/entities/asset.entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/services/asset.service';
import { PriceProviderService } from 'src/subdomains/pricing/application/services/price-provider.service';
import { Fiat } from '../../domain/enums/fiat.enum';

@Injectable()
export class AssetPricesService {
  constructor(private readonly assetService: AssetService, private readonly priceProvider: PriceProviderService) {}

  // --- JOBS --- //
  @Cron(CronExpression.EVERY_30_MINUTES)
  @Lock(1800)
  async updateUsdValues() {
    if (Config.processDisabled(Process.PRICING)) return;

    const assets = await this.assetService.getAllAssetsForBlockchain(Blockchain.DEFICHAIN);
    for (const asset of assets.filter((a) => a.category !== AssetCategory.POOL_PAIR && a.chainId)) {
      try {
        const usdPrice = await this.priceProvider.getFiatPrice(asset, Fiat.USD);
        await this.assetService.updatePrice(asset.id, 1 / usdPrice.price);
      } catch (e) {
        console.error(`Failed to update price of asset ${asset.name}:`, e);
      }
    }
  }
}
