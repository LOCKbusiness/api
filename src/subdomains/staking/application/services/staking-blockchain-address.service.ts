import { Injectable } from '@nestjs/common';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { StakingBlockchainAddressRepository } from '../repositories/staking-blockchain-address.repository';

@Injectable()
export class StakingBlockchainAddressService {
  constructor(private readonly repository: StakingBlockchainAddressRepository) {}

  async getAvailableAddress(): Promise<StakingBlockchainAddress> {
    // TODO - implement proper staking address fetch
    const address = await this.repository.findOne();

    /*
    const address = await this.repository
      .createQueryBuilder('staking_blockchain_address')
      .leftJoin('deposit.route', 'route')
      .where('route.id IS NULL AND deposit.blockchain = :blockchain', { blockchain })
      .getOne();
    */

    if (!address) throw new Error('No free address available in the address pool');

    return address;
  }
}
