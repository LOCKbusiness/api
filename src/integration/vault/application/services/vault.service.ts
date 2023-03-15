import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { IsNull, Not } from 'typeorm';
import { Vault } from '../../domain/entities/vault.entity';
import { VaultRepository } from '../repositories/vault.repository';
import LocVaults from '../repositories/vault-loc.json';
import DevVaults from '../repositories/vault-dev.json';
import StgVaults from '../repositories/vault-stg.json';
import PrdVaults from '../repositories/vault-prd.json';
import { VaultDto } from '../../dto/vault.dto';

@Injectable()
export class VaultService {
  constructor(private readonly repository: VaultRepository) {}

  async getByAddress(address: string): Promise<Vault> {
    return this.repository.findOneBy({ address });
  }

  async getByAddressAndVault(address: string, vault: string): Promise<Vault> {
    return this.repository.findOneBy({ address, vault });
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
    return this.repository.countBy({ vault: Not(IsNull()) });
  }

  static isOnList(address: string): boolean {
    return this.vaultsAsList().find((v) => v.address === address) !== undefined;
  }

  private static vaultsAsList(): VaultDto[] {
    switch (Config.environment) {
      case 'loc':
        return LocVaults as VaultDto[];
      case 'dev':
        return DevVaults as VaultDto[];
      case 'stg':
        return StgVaults as VaultDto[];
      case 'prd':
        return PrdVaults as VaultDto[];
    }
  }
}
