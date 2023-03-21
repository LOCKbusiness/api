import { Asset } from 'src/shared/entities/asset.entity';

export class DexUtil {
  static parseAssetPair(asset: Asset): [string, string] {
    const assetPair = asset.name.split('-');

    if (assetPair.length !== 2) {
      throw new Error(`Provided asset is not a liquidity pool pair. Name: ${asset.name}`);
    }

    return [assetPair[0], assetPair[1]];
  }
}
