import { Injectable } from '@nestjs/common';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { IsNull } from 'typeorm';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { StakingBlockchainAddressRepository } from '../repositories/staking-blockchain-address.repository';

@Injectable()
export class StakingBlockchainAddressService {
  constructor(private readonly repository: StakingBlockchainAddressRepository) {}

  async getAvailableAddressForStaking(staking: Staking): Promise<StakingBlockchainAddress> {
    // TODO - potential concurrency issues, consider base class for source...
    const address = await this.repository.findOne({ staking: IsNull() });

    if (!address) throw new Error('No free address available in the address pool');

    address.assignStaking(staking);

    await this.repository.save(address);

    return address;
  }
}
