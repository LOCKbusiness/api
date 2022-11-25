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

  //*** UTILITY METHODS ***//

  async getDfiCoin(): Promise<Asset> {
    return this.getAssetByQuery({
      name: 'DFI',
      blockchain: Blockchain.DEFICHAIN,
      type: AssetType.COIN,
    });
  }

  async getDfiToken(): Promise<Asset> {
    return this.getAssetByQuery({
      name: 'DFI',
      blockchain: Blockchain.DEFICHAIN,
      type: AssetType.TOKEN,
    });
  }

  async getEthCoin(): Promise<Asset> {
    return this.getAssetByQuery({
      name: 'ETH',
      blockchain: Blockchain.ETHEREUM,
      type: AssetType.COIN,
    });
  }

  async getBnbCoin(): Promise<Asset> {
    return this.getAssetByQuery({
      name: 'BNB',
      blockchain: Blockchain.BINANCE_SMART_CHAIN,
      type: AssetType.COIN,
    });
  }

  async getBtcCoin(): Promise<Asset> {
    return this.getAssetByQuery({
      name: 'BTC',
      blockchain: Blockchain.BITCOIN,
      type: AssetType.COIN,
    });
  }
}
