import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { AssetStakingMetadata } from '../../domain/entities/asset-staking-metadata.entity';

@Injectable()
export class AssetStakingMetadataRepository extends BaseRepository<AssetStakingMetadata> {
  constructor(manager: EntityManager) {
    super(AssetStakingMetadata, manager);
  }
}
