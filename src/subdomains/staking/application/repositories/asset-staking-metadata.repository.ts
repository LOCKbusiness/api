import { EntityRepository, Repository } from 'typeorm';
import { AssetStakingMetadata } from '../../domain/entities/asset-staking-metadata.entity';

@EntityRepository(AssetStakingMetadata)
export class AssetStakingMetadataRepository extends Repository<AssetStakingMetadata> {}
