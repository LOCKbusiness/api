import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { StakingBlockchainAddressRepository } from '../repositories/staking-blockchain-address.repository';

@Injectable()
export class StakingBlockchainAddressService {
  constructor(private readonly repository: StakingBlockchainAddressRepository) {}

  async getAvailableAddress(): Promise<StakingBlockchainAddress> {
    const address = await this.repository.findOne({ staking: IsNull() });

    if (!address) throw new Error('No free address available in the address pool');

    return address;
  }
}
