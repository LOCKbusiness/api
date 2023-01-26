import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { AssetStakingMetadata } from '../../domain/entities/asset-staking-metadata.entity';

@Injectable()
export class AssetStakingMetadataRepository extends Repository<AssetStakingMetadata> {
  constructor(manager: EntityManager) {
    super(AssetStakingMetadata, manager);
  }
}
