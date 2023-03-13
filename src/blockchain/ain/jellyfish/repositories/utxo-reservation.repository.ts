import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { UtxoReservation } from '../domain/utxo-reservation.entity';

@Injectable()
export class UtxoReservationRepository extends Repository<UtxoReservation> {
  constructor(manager: EntityManager) {
    super(UtxoReservation, manager);
  }
}
