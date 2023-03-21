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
  private readonly client: CoinGeckoClient;

  private metaData: AssetStakingMetadata[];

  constructor(private readonly assetStakingMetadataRepo: AssetStakingMetadataRepository) {
    this.client = new CoinGeckoClient();
  }

  async getPrice(fiat: Fiat, asset: Asset): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(asset);

    const { data } = await this.callApi((c) => c.simple.price({ ids: coinGeckoId, vs_currencies: fiat }));

    const price = data[coinGeckoId.toLowerCase()]?.[fiat.toLowerCase()];
    if (!price) throw new ServiceUnavailableException(`Failed to get price for ${fiat} -> ${name}`);

    return Price.create(fiat, name, price);
  }

  async getPriceAt(fiat: Fiat, asset: Asset, date: Date): Promise<Price> {
    return this.getAvgPrice(fiat, asset, date, Util.hoursAfter(1, date));
  }

  async getAvgPrice(fiat: Fiat, asset: Asset, from: Date, to: Date): Promise<Price> {
    const { name, coinGeckoId } = await this.getAssetInfo(asset);

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

  // --- HELPER METHODS --- //
  private async getAssetInfo(asset: Asset): Promise<{ name: string; coinGeckoId: string }> {
    const metadata = (this.metaData ??= await this.assetStakingMetadataRepo.find({ relations: ['asset'] }));

    const assetStakingMetadata = metadata.find((m) => m.asset.id === asset.id);
    if (!assetStakingMetadata) throw new MetadataNotFoundException(`No metadata found for asset ${asset.id}`);

    return { name: asset.name, coinGeckoId: assetStakingMetadata.fiatPriceProviderAssetId };
  }

  private callApi<T>(call: (c: CoinGeckoClient) => Promise<T>): Promise<T> {
    return Util.retry(() => call(this.client), 3);
  }
}
