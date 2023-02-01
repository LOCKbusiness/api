import { Entity, Column, Index } from 'typeorm';
import { Blockchain } from '../../enums/blockchain.enum';
import { IEntity } from '../entity';
import { AssetQuery } from './asset.service';

export enum AssetType {
  COIN = 'Coin',
  TOKEN = 'Token',
}

export enum AssetCategory {
  POOL_PAIR = 'PoolPair',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
}

@Entity()
@Index('nameTypeBlockchain', (asset: Asset) => [asset.name, asset.type, asset.blockchain], {
  unique: true,
})
export class Asset extends IEntity {
  @Column()
  name: string;

  @Column()
  displayName: string;

  @Column({ nullable: false, default: AssetType.TOKEN })
  type: AssetType;

  @Column({ nullable: false, default: AssetCategory.STOCK })
  category: AssetCategory;

  @Column({ default: Blockchain.DEFICHAIN })
  blockchain: Blockchain;

  isEqual(asset: AssetQuery): boolean {
    return this.name === asset.name && this.type === asset.type && this.blockchain === asset.blockchain;
  }
}
