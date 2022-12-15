import { Injectable } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { BlockchainAddressReservation } from '../../domain/entities/blockchain-address-reservation.entity';
import { ReservableBlockchainAddress } from '../../domain/entities/reservable-blockchain-address.entity';
import { BlockchainAddressReservationPurpose } from '../../domain/enums';
import { BlockchainAddressReservationRepository } from '../repositories/blockchain-address-reservation.repository';
import { ReservableBlockchainAddressRepository } from '../repositories/reservable-blockchain-address.repository';

@Injectable()
export class ReservableBlockchainAddressService {
  constructor(
    private readonly addressRepo: ReservableBlockchainAddressRepository,
    private readonly reservationRepo: BlockchainAddressReservationRepository,
  ) {}

  async getAvailableAddress(purpose: BlockchainAddressReservationPurpose): Promise<ReservableBlockchainAddress> {
    // retry (in case of deposit address conflict)
    return Util.retry(async () => {
      const address = await this.addressRepo
        .createQueryBuilder('address')
        .leftJoin('address.reservation', 'reservation')
        .where('reservation.id IS NULL')
        .getOne();

      if (!address) throw new Error('No free address available in the address pool');

      const reservation = BlockchainAddressReservation.create(purpose, address);
      await this.reservationRepo.save(reservation);

      return address;
    }, 2);
  }
}
