import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AssetService } from 'src/shared/services/asset.service';
import { PriceProvider } from '../application/interfaces';
import { AssetStakingMetadataRepository } from '../application/repositories/asset-staking-metadata.repository';
import CoinGeckoClient = require('coingecko-api');
import { Util } from 'src/shared/util';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/entities/price';

enum Currency {
  BTC = 'BTC',
}

@Injectable()
export class CoinGeckoService implements PriceProvider {
  private readonly client: CoinGeckoClient;

  constructor(
    private readonly assetService: AssetService,
    private readonly assetStakingMetadataRepo: AssetStakingMetadataRepository,
  ) {
    this.client = new CoinGeckoClient();
  }

  // --- FIAT --- //
  async getFiatPrice(fiat: Currency | Fiat, assetId: number): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(assetId);

    const { data } = await this.callApi((c) => c.simple.price({ ids: coinGeckoId, vs_currencies: fiat }));

    const price = data[coinGeckoId.toLowerCase()]?.[fiat.toLowerCase()];
    if (!price) throw new ServiceUnavailableException(`Failed to get price for ${fiat} -> ${name}`);

    return Price.create(fiat, name, price);
  }

  async getFiatPriceAt(fiat: Currency | Fiat, assetId: number, date: Date): Promise<Price> {
    return this.getAvgFiatPrice(fiat, assetId, date, Util.hoursAfter(1, date));
  }

  async getAvgFiatPrice(fiat: Currency | Fiat, assetId: number, from: Date, to: Date): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(assetId);

    const { data } = await this.callApi((c) =>
      c.coins.fetchMarketChartRange(coinGeckoId, {
        vs_currency: fiat,
        from: from.getTime() / 1000,
        to: to.getTime() / 1000,
      }),
    );

    const price = Util.avg(data.prices.map((p) => p[1]));

    return Price.create(fiat, name, price);
  }

  // --- EXCHANGE --- //
  async getExchangePrice(fromAssetId: number, toAssetId: number): Promise<Price> {
    const prices = await Promise.all([
      this.getFiatPrice(Currency.BTC, fromAssetId),
      this.getFiatPrice(Currency.BTC, toAssetId),
    ]);

    return this.joinPrices(...prices);
  }

  async getExchangePriceAt(fromAssetId: number, toAssetId: number, date: Date): Promise<Price> {
    const prices = await Promise.all([
      this.getFiatPriceAt(Currency.BTC, fromAssetId, date),
      this.getFiatPriceAt(Currency.BTC, toAssetId, date),
    ]);

    return this.joinPrices(...prices);
  }

  async getAverageExchangePrice(fromAssetId: number, toAssetId: number, from: Date, to: Date): Promise<Price> {
    const prices = await Promise.all([
      this.getAvgFiatPrice(Currency.BTC, fromAssetId, from, to),
      this.getAvgFiatPrice(Currency.BTC, toAssetId, from, to),
    ]);

    return this.joinPrices(...prices);
  }

  // --- HELPER METHODS --- //
  private async getAssetInfo(assetId: number): Promise<{ name: string; coinGeckoId: string }> {
    const asset = await this.assetService.getAssetById(assetId);
    const assetStakingMetadata = await this.assetStakingMetadataRepo.findOneBy({ asset: { id: assetId } });
    if (!assetStakingMetadata) throw new Error(`No metadata found for asset ${assetId}`);

    return { name: asset.name, coinGeckoId: assetStakingMetadata.fiatPriceProviderAssetId };
  }

  private joinPrices(from: Price, to: Price): Price {
    return Price.create(from.target, to.target, to.price / from.price);
  }

  private callApi<T>(call: (c: CoinGeckoClient) => Promise<T>): Promise<T> {
    return Util.retry(() => call(this.client), 3);
  }
}
