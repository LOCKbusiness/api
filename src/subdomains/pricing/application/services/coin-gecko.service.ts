import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Price } from '../../domain/entities/price';
import { AssetStakingMetadataRepository } from '../repositories/asset-staking-metadata.repository';
import { Util } from 'src/shared/util';
import { Fiat } from 'src/subdomains/pricing/domain/enums/fiat.enum';
import { Asset } from 'src/shared/entities/asset.entity';
import { MetadataNotFoundException } from '../../domain/exceptions/metadata-not-found.exception';
import { AssetStakingMetadata } from '../../domain/entities/asset-staking-metadata.entity';
import CoinGeckoClient = require('coingecko-api');

@Injectable()
export class CoinGeckoService {
  private readonly refreshPeriod = 15; // minutes
  private readonly client: CoinGeckoClient;

  private metaDataCache?: AssetStakingMetadata[];
  private priceCache = new Map<string, { updated: Date; price: Price }>();

  constructor(private readonly assetStakingMetadataRepo: AssetStakingMetadataRepository) {
    this.client = new CoinGeckoClient();
  }

  async getPrice(asset: Asset, fiat: Fiat): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(asset);
    const identifier = `${coinGeckoId}/${fiat}`;

    if (!(this.priceCache.get(identifier)?.updated > Util.minutesBefore(this.refreshPeriod))) {
      const price = await this.fetchPrice(name, coinGeckoId, fiat);
      this.priceCache.set(identifier, { updated: new Date(), price });
    }

    return this.priceCache.get(identifier).price;
  }

  async getPriceAt(asset: Asset, fiat: Fiat, date: Date): Promise<Price> {
    return this.getAvgPrice(asset, fiat, date, Util.hoursAfter(1, date));
  }

  async getAvgPrice(asset: Asset, fiat: Fiat, from: Date, to: Date): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(asset);

    const { data } = await this.callApi((c) =>
      c.coins.fetchMarketChartRange(coinGeckoId, {
        vs_currency: fiat,
        from: from.getTime() / 1000,
        to: to.getTime() / 1000,
      }),
    );

    const price = Util.avg(data.prices.map((p) => p[1]));

    return Price.create(name, fiat, 1 / price);
  }

  // --- HELPER METHODS --- //
  private async fetchPrice(name: string, coinGeckoId: string, fiat: Fiat): Promise<Price> {
    const { data } = await this.callApi((c) => c.simple.price({ ids: coinGeckoId, vs_currencies: fiat }));

    const price = data[coinGeckoId.toLowerCase()]?.[fiat.toLowerCase()];
    if (!price) throw new ServiceUnavailableException(`Failed to get price for ${name} -> ${fiat}`);

    return Price.create(name, fiat, 1 / price);
  }

  private async getAssetInfo(asset: Asset): Promise<{ name: string; coinGeckoId: string }> {
    const metadata = (this.metaDataCache ??= await this.assetStakingMetadataRepo.find({ relations: ['asset'] }));

    const assetStakingMetadata = metadata.find((m) => m.asset.id === asset.id);
    if (!assetStakingMetadata) throw new MetadataNotFoundException(`No metadata found for asset ${asset.id}`);

    return { name: asset.name, coinGeckoId: assetStakingMetadata.fiatPriceProviderAssetId };
  }

  private callApi<T>(call: (c: CoinGeckoClient) => Promise<T>): Promise<T> {
    return call(this.client);
  }
}
