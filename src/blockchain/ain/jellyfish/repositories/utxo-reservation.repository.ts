import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { UtxoReservation } from '../domain/utxo-reservation.entity';

@Injectable()
export class UtxoReservationRepository extends BaseRepository<UtxoReservation> {
  constructor(manager: EntityManager) {
    super(UtxoReservation, manager);
  }
}
