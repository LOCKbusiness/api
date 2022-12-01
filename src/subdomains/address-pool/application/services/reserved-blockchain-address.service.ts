import { Injectable } from '@nestjs/common';
import { ReservedBlockchainAddress } from '../../domain/entities/reserved-blockchain-address.entity';
import { ReservedBlockchainAddressRepository } from '../repositories/reserved-blockchain-address.repository';

@Injectable()
export class ReservedBlockchainAddressService {
  constructor(private readonly repository: ReservedBlockchainAddressRepository) {}

  async getAvailableAddress(): Promise<ReservedBlockchainAddress> {
    const address = await this.repository
      .createQueryBuilder('address')
      .leftJoin('address.reservation', 'reservation')
      .where('reservation.id IS NULL')
      .getOne();

    if (!address) throw new Error('No free address available in the address pool');

    return address;
  }
}
