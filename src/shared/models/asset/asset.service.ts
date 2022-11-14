import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetRepository } from 'src/shared/models/asset/asset.repository';
import { Asset, AssetType } from './asset.entity';

export interface AssetQuery {
  name: string;
  blockchain: Blockchain;
  type: AssetType;
}

@Injectable()
export class AssetService {
  constructor(private assetRepo: AssetRepository) {}

  async getAllAsset(blockchain: Blockchain): Promise<Asset[]> {
    return this.assetRepo.find({ where: { blockchain } });
  }

  async getAssetById(id: number): Promise<Asset> {
    return this.assetRepo.findOne(id);
  }

  async getAssetByQuery(query: AssetQuery): Promise<Asset> {
    return this.assetRepo.findOne({ where: query });
  }
}
