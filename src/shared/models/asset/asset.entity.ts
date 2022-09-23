import { Entity, Column, Index } from 'typeorm';
import { Blockchain } from '../../enums/blockchain.enum';
import { IEntity } from '../entity';

export enum AssetCategory {
  POOL_PAIR = 'PoolPair',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
}

@Entity()
@Index('nameBlockchain', (asset: Asset) => [asset.name, asset.blockchain], {
  unique: true,
})
export class Asset extends IEntity {
  @Column()
  name: string;

  @Column()
  displayName: string;

  @Column({ nullable: false, default: AssetCategory.STOCK })
  category: AssetCategory;

  @Column({ default: Blockchain.DEFICHAIN })
  blockchain: Blockchain;
}
