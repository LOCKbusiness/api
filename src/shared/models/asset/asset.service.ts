import { Injectable } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetRepository } from 'src/shared/models/asset/asset.repository';
import { In } from 'typeorm';
import { Asset } from './asset.entity';

export interface AssetQuery {
  name: string;
  blockchain: string;
  isToken?: boolean;
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
    let { name: dexName } = query;
    const { blockchain, isToken } = query;

    // TODO - remove it ->isToken
    if (dexName === 'DFI' && isToken) dexName = 'DFI-Token';
    return this.assetRepo.findOne({ where: { name: dexName, blockchain } });
  }
}
