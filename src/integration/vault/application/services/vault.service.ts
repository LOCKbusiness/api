import { Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { Vault } from '../../domain/entities/vault.entity';
import { VaultRepository } from '../repositories/vault.repository';

@Injectable()
export class VaultService {
  constructor(private readonly repository: VaultRepository) {}

  async getByAddress(address: string): Promise<Vault> {
    return this.repository.findOne({ where: { address } });
  }

  async getByAddressAndVault(address: string, vault: string): Promise<Vault> {
    return this.repository.findOne({ where: { address, vault } });
  }

  async getAllAddresses(): Promise<string[]> {
    return this.getAll().then((vaults) => vaults.map((v) => v.address));
  }

  async getAllIds(): Promise<string[]> {
    return this.getAll()
      .then((vaults) => vaults.map((v) => v.vault))
      .then((ids) => ids.filter((id) => id));
  }

  async getAll(): Promise<Vault[]> {
    return this.repository.find();
  }

  async getActiveCount(): Promise<number> {
    return this.repository.count({ where: { vault: Not(IsNull()) } });
  }
}
