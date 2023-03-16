import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { ReservableBlockchainAddress } from '../../domain/entities/reservable-blockchain-address.entity';

@Injectable()
export class ReservableBlockchainAddressRepository extends BaseRepository<ReservableBlockchainAddress> {
  constructor(manager: EntityManager) {
    super(ReservableBlockchainAddress, manager);
  }
}
