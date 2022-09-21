import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetRepository } from 'src/shared/models/asset/asset.repository';
import { In } from 'typeorm';
import { Asset } from './asset.entity';

export interface AssetQuery {
  name: string;
  blockchain: string;
}

@Injectable()
export class AssetService {
  constructor(private assetRepo: AssetRepository) {}

  async getAllAsset(blockchains: Blockchain[]): Promise<Asset[]> {
    blockchains ??= [Blockchain.DEFICHAIN];
    return this.assetRepo.find({ where: { blockchain: In(blockchains) } });
  }

  async getAssetById(id: number): Promise<Asset> {
    return this.assetRepo.findOne(id);
  }

  async getAssetByQuery(query: AssetQuery): Promise<Asset> {
    const { name: dexName, blockchain } = query;

    return this.assetRepo.findOne({ where: { name: dexName, blockchain } });
  }
}
