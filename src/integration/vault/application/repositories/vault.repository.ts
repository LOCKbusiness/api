import { EntityRepository, Repository } from 'typeorm';
import { Vault } from '../../domain/entities/vault.entity';

@EntityRepository(Vault)
export class VaultRepository extends Repository<Vault> {}
