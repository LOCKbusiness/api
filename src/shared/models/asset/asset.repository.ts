import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Asset } from './asset.entity';

@Injectable()
export class AssetRepository extends Repository<Asset> {
  constructor(manager: EntityManager) {
    super(Asset, manager);
  }
}
