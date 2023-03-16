import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { BlockchainAddressReservation } from '../../domain/entities/blockchain-address-reservation.entity';

@Injectable()
export class BlockchainAddressReservationRepository extends BaseRepository<BlockchainAddressReservation> {
  constructor(manager: EntityManager) {
    super(BlockchainAddressReservation, manager);
  }
}
