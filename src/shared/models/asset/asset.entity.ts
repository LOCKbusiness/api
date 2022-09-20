import { Entity, Column, Index } from 'typeorm';
import { Blockchain } from '../../enums/blockchain.enum';
import { IEntity } from '../entity';

export enum AssetCategory {
  POOL_PAIR = 'PoolPair',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
}

@Entity()
@Index('nameBlockchain', (asset: Asset) => [asset.displayName, asset.blockchain], {
  unique: true,
})
export class Asset extends IEntity {
  @Column({ nullable: true, length: 256 })
  name: string;

  @Column({ length: 256 })
  displayName: string;

  @Column({ length: 256, nullable: false, default: AssetCategory.STOCK })
  category: AssetCategory;

  @Column({ length: 256, default: Blockchain.DEFICHAIN })
  blockchain: Blockchain;
}
