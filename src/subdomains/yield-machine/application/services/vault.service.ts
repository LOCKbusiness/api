import { Injectable } from '@nestjs/common';
import { Vault } from '../../domain/entities/vault.entity';
import { VaultRepository } from '../repositories/vault.repository';

@Injectable()
export class VaultService {
  constructor(private readonly repository: VaultRepository) {}

  async get(address: string, vault: string): Promise<Vault> {
    return this.repository.findOne({ where: { address, vault } });
  }
}
