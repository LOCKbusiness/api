import { Injectable } from '@nestjs/common';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { IsNull } from 'typeorm';
import { BlockchainAddress } from './blockchain-address.entity';
import { BlockchainAddressRepository } from './blockchain-address.repository';

@Injectable()
export class BlockchainAddressService {
  constructor(private readonly repository: BlockchainAddressRepository) {}

  async getAvailableAddressForStaking(staking: Staking): Promise<BlockchainAddress> {
    const address = await this.repository.findOne({ staking: IsNull() });

    if (!address) throw new Error('No free address available in the address pool');

    address.assignStaking(staking);

    await this.repository.save(address);

    return address;
  }
}
