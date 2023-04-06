import { Injectable, NotImplementedException } from '@nestjs/common';
import { Asset, AssetType } from 'src/shared/entities/asset.entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetService } from 'src/shared/services/asset.service';
import { Fiat } from 'src/subdomains/pricing/domain/enums/fiat.enum';
import { Price } from '../../domain/entities/price';
import { MetadataNotFoundException } from '../../domain/exceptions/metadata-not-found.exception';
import { CoinGeckoService } from './coin-gecko.service';
import { PricingDeFiChainService } from './pricing-defichain.service';

@Injectable()
export class PriceProviderService {
  private readonly chainsWithSwapPricing = [Blockchain.DEFICHAIN];
  private readonly refAssetMap = new Map<Blockchain, Asset>();

  constructor(
    private readonly assetService: AssetService,
    private readonly coinGeckoService: CoinGeckoService,
    private readonly deFiChainService: PricingDeFiChainService,
  ) {}

  async getPrice(from: Asset, to: Asset): Promise<Price> {
    // get swap price, if available
    if (from.blockchain === to.blockchain && this.chainsWithSwapPricing.includes(from.blockchain))
      return this.getSwapPrice(from, to);

    // get exchange price via USD
    const fromPrice = await this.getFiatPrice(from, Fiat.USD);
    const toPrice = await this.getFiatPrice(to, Fiat.USD);

    return Price.join(fromPrice, toPrice.invert());
  }

  async getFiatPrice(asset: Asset, fiat: Fiat): Promise<Price> {
    try {
      return await this.coinGeckoService.getPrice(asset, fiat);
    } catch (e) {
      if (!(e instanceof MetadataNotFoundException)) throw e;
    }

    // metadata not found -> use reference asset
    const refAsset = await this.getFiatReferenceAssetFor(asset.blockchain);

    const toRef = await this.getSwapPrice(asset, refAsset);
    const fromRef = await this.coinGeckoService.getPrice(refAsset, fiat);

    return Price.join(toRef, fromRef);
  }

  // --- HELPER METHODS --- //
  private async getFiatReferenceAssetFor(blockchain: Blockchain): Promise<Asset> {
    if (!this.refAssetMap.has(blockchain)) {
      const refAsset = await this.assetService.getAssetByQuery({
        name: 'USDT',
        type: AssetType.TOKEN,
        blockchain: blockchain,
      });
      this.refAssetMap.set(blockchain, refAsset);
    }

    return this.refAssetMap.get(blockchain);
  }

  async getSwapPrice(from: Asset, to: Asset): Promise<Price> {
    if (from.blockchain !== to.blockchain) throw new Error('Inter blockchain swap prices not possible');

    if (!this.chainsWithSwapPricing.includes(from.blockchain))
      throw new NotImplementedException(`Swap pricing is not implemented for ${from.blockchain}`);

    return this.deFiChainService.getPrice(from, to);
  }
}
