import { Injectable } from '@nestjs/common';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';
import { WalletProviderRepository } from '../repositories/wallet-provider.repository';

@Injectable()
export class WalletProviderService {
  constructor(private walletProviderRepo: WalletProviderRepository) {}

  async getWalletOrDefault(id: number): Promise<WalletProvider> {
    return (await this.walletProviderRepo.findOne(id)) ?? (await this.walletProviderRepo.findOne(1));
  }
}
