import { Injectable, NotFoundException } from '@nestjs/common';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetRepository } from 'src/shared/repositories/asset.repository';
import { Asset, AssetType } from '../entities/asset.entity';
import { UpdateAssetDto } from '../dto/update-asset.dto';

export interface AssetQuery {
  name: string;
  blockchain: Blockchain;
  type: AssetType;
}

@Injectable()
export class AssetService {
  constructor(private assetRepo: AssetRepository) {}

  async updateAsset(assetId: number, dto: UpdateAssetDto): Promise<Asset> {
    const entity = await this.assetRepo.findOneBy({ id: assetId });
    if (!entity) throw new NotFoundException('Asset not found');

    return this.assetRepo.save({ ...entity, ...dto });
  }

  async getAllAssets(): Promise<Asset[]> {
    return this.assetRepo.find();
  }

  async getAllAssetsForBlockchain(blockchain: Blockchain): Promise<Asset[]> {
    return this.assetRepo.findBy({ blockchain });
  }

  async getAssetById(id: number): Promise<Asset> {
    return this.assetRepo.findOneBy({ id });
  }

  async getAssetByQuery(query: AssetQuery): Promise<Asset> {
    return this.assetRepo.findOne({ where: query });
  }

  async getAssetsByQuery(query: AssetQuery[]): Promise<Asset[]> {
    return this.assetRepo.find({ where: query });
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
