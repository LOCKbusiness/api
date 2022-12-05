import { Injectable } from '@nestjs/common';
import { BlockchainAddressReservation } from '../../domain/entities/blockchain-address-reservation.entity';
import { ReservedBlockchainAddress } from '../../domain/entities/reserved-blockchain-address.entity';
import { BlockchainAddressReservationRepository } from '../repositories/blockchain-address-reservation.repository';
import { ReservedBlockchainAddressRepository } from '../repositories/reserved-blockchain-address.repository';

@Injectable()
export class ReservedBlockchainAddressService {
  constructor(
    private readonly addressRepo: ReservedBlockchainAddressRepository,
    private readonly reservationRepo: BlockchainAddressReservationRepository,
  ) {}

  async getAvailableAddress(): Promise<ReservedBlockchainAddress> {
    const address = await this.addressRepo
      .createQueryBuilder('address')
      .leftJoin('address.reservation', 'reservation')
      .where('reservation.id IS NULL')
      .getOne();

    if (!address) throw new Error('No free address available in the address pool');

    const reservation = BlockchainAddressReservation.create(address);
    const savedReservation = await this.reservationRepo.save(reservation);

    address.reserve(savedReservation);
    await this.addressRepo.save(address);

    return address;
  }
}
