import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { Vault } from '../../domain/entities/vault.entity';

@Injectable()
export class VaultRepository extends BaseRepository<Vault> {
  constructor(manager: EntityManager) {
    super(Vault, manager);
  }
}
