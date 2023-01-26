import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Vault } from '../../domain/entities/vault.entity';

@Injectable()
export class VaultRepository extends Repository<Vault> {
  constructor(manager: EntityManager) {
    super(Vault, manager);
  }
}
