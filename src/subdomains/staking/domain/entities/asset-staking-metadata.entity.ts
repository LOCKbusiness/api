import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class AssetStakingMetadata extends IEntity {
  @OneToOne(() => Asset, { nullable: false })
  @JoinColumn()
  asset: Asset;

  @Column({ nullable: false })
  fiatPriceProviderAssetId: string;
}
