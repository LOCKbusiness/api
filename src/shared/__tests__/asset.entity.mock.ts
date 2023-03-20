import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetCategory, AssetType } from '../entities/asset.entity';

export function createDefaultAsset(): Asset {
  return createCustomAsset({});
}

export function createCustomAsset(customValues: Partial<Asset>): Asset {
  const { name, blockchain, category, type } = customValues;
  const keys = Object.keys(customValues);

  const entity = new Asset();

  entity.name = keys.includes('name') ? name : 'dTSLA';
  entity.blockchain = keys.includes('blockchain') ? blockchain : Blockchain.DEFICHAIN;
  entity.category = keys.includes('category') ? category : AssetCategory.CRYPTO;
  entity.type = keys.includes('type') ? type : AssetType.COIN;

  return entity;
}
