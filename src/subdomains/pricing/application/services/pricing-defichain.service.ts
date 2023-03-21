import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs';
import { Injectable } from '@nestjs/common';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Asset, AssetCategory } from 'src/shared/entities/asset.entity';
import { AssetService } from 'src/shared/services/asset.service';
import { Util } from 'src/shared/util';
import { Price } from '../../domain/entities/price';

enum Direction {
  AB = 'ab',
  BA = 'ba',
}

@Injectable()
export class PricingDeFiChainService {
  private client: WhaleClient;

  private dfiToken: Asset;
  private dusdToken: Asset;
  private poolData: { pools: PoolPairData[]; updated: Date };

  constructor(private readonly assetService: AssetService, readonly whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  async getPrice(from: Asset, to: Asset): Promise<Price> {
    const pools = await this.getPools();

    const fromPath = await this.getPathAsset(from);
    const toPath = await this.getPathAsset(to);

    const prices = [
      this.getPoolPrice(from, fromPath, pools),
      this.getPoolPrice(fromPath, toPath, pools),
      this.getPoolPrice(toPath, to, pools),
    ];

    return Price.create(
      from.name,
      to.name,
      prices.reduce((prev, curr) => prev * curr, 1),
    );
  }

  // --- HELPER METHODS --- //
  private async getPools(): Promise<PoolPairData[]> {
    // update every minute
    if (!(this.poolData?.updated > Util.minutesBefore(1)))
      this.poolData = { pools: await this.client.getAllPools(), updated: new Date() };

    return this.poolData.pools;
  }

  private getPoolPrice(from: Asset, to: Asset, pools: PoolPairData[]): number {
    if (from.name === to.name) return 1;

    const { pool, direction } = this.findPool(from, to, pools);

    const priceRatio = +pool.priceRatio[direction];
    const commission = +(pool.commission ?? 0);
    const { inFee, outFee } =
      direction === Direction.AB
        ? { inFee: +(pool.tokenA.fee?.inPct ?? 0), outFee: +(pool.tokenB.fee?.outPct ?? 0) }
        : { inFee: +(pool.tokenB.fee?.inPct ?? 0), outFee: +(pool.tokenA.fee?.outPct ?? 0) };

    return priceRatio / (1 - commission) / (1 - inFee) / (1 - outFee);
  }

  private findPool(from: Asset, to: Asset, pools: PoolPairData[]): { pool: PoolPairData; direction: Direction } {
    const pool = pools.find((p) => [from.name, to.name].every((t) => [p.tokenA.symbol, p.tokenB.symbol].includes(t)));
    if (!pool) throw new Error(`No pool found for assets ${from.name} and ${to.name}`);

    return { pool, direction: pool.tokenA.symbol === from.name ? Direction.AB : Direction.BA };
  }

  private async getPathAsset(asset: Asset): Promise<Asset> {
    switch (asset.category) {
      case AssetCategory.CRYPTO:
        return (this.dfiToken ??= await this.assetService.getDfiToken());
      case AssetCategory.STOCK:
        return (this.dusdToken ??= await this.assetService.getDusdToken());
      default:
        throw new Error(`Asset category ${asset.category} not supported`);
    }
  }
}
