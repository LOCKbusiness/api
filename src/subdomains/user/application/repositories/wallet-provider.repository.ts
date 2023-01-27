import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';

@Injectable()
export class WalletProviderRepository extends Repository<WalletProvider> {
  constructor(manager: EntityManager) {
    super(WalletProvider, manager);
  }
}
