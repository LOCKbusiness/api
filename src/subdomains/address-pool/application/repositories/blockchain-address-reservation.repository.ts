import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { BlockchainAddressReservation } from '../../domain/entities/blockchain-address-reservation.entity';

@Injectable()
export class BlockchainAddressReservationRepository extends Repository<BlockchainAddressReservation> {
  constructor(manager: EntityManager) {
    super(BlockchainAddressReservation, manager);
  }
}
