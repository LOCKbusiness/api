import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Price } from 'src/shared/models/price';
import { HttpService } from 'src/shared/services/http.service';
import { FiatPriceProvider } from '../application/interfaces';
import { AssetStakingMetadataRepository } from '../application/repositories/asset-staking-metadata.repository';

@Injectable()
export class CoinGeckoService implements FiatPriceProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly assetService: AssetService,
    private readonly assetStakingMetadataRepo: AssetStakingMetadataRepository,
  ) {}

  async getFiatPrice(fiatName: Fiat, assetId: number): Promise<Price> {
    const asset = await this.assetService.getAssetById(assetId);
    const assetStakingMetadata = await this.assetStakingMetadataRepo.findOne({ asset });
    const assetCoinGeckoId = assetStakingMetadata.fiatPriceProviderAssetId;

    const result = await this.httpService.get(`${Config.priceProviders.coinGecko.baseUrl}/simple/price`, {
      params: { vs_currencies: fiatName, ids: assetCoinGeckoId },
    });

    const price = result[assetCoinGeckoId.toLowerCase()][fiatName.toLowerCase()];

    return Price.create(fiatName, asset.name, price);
  }
}
