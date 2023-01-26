import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { ReservableBlockchainAddress } from '../../domain/entities/reservable-blockchain-address.entity';

@Injectable()
export class ReservableBlockchainAddressRepository extends Repository<ReservableBlockchainAddress> {
  constructor(manager: EntityManager) {
    super(ReservableBlockchainAddress, manager);
  }
}
