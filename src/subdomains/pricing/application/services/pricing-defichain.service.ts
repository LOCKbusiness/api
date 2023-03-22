import { Injectable, NotImplementedException } from '@nestjs/common';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Asset, AssetCategory } from 'src/shared/entities/asset.entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetService } from 'src/shared/services/asset.service';
import { Price } from '../../domain/entities/price';

@Injectable()
export class PricingDeFiChainService {
  private client: WhaleClient;

  constructor(readonly whaleService: WhaleService, private readonly assetService: AssetService) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  async getPrice(from: Asset, to: Asset): Promise<Price> {
    if (to.category === AssetCategory.POOL_PAIR)
      throw new NotImplementedException(`Target asset of pool pair is not supported`);

    const price =
      from.category === AssetCategory.POOL_PAIR
        ? await this.getPoolPrice(from, to)
        : await this.getPriceValue(from, to);

    return Price.create(from.name, to.name, 1 / price);
  }

  // --- HELPER METHODS --- //
  private async getPriceValue(from: Asset, to: Asset): Promise<number> {
    if (from.id === to.id) return 1;

    return this.client.getSwapPrice(from.chainId, to.chainId);
  }

  private async getPoolPrice(from: Asset, to: Asset): Promise<number> {
    const pool = await this.client.getPool(from.chainId);

    const assetA = await this.assetService.getAssetByChainId(Blockchain.DEFICHAIN, pool.tokenA.id);
    const amountA = Math.sqrt(+pool.priceRatio.ab);
    const priceA = await this.getPriceValue(assetA, to);

    const assetB = await this.assetService.getAssetByChainId(Blockchain.DEFICHAIN, pool.tokenB.id);
    const amountB = Math.sqrt(+pool.priceRatio.ba);
    const priceB = await this.getPriceValue(assetB, to);

    return amountA * priceA + amountB * priceB;
  }
}
