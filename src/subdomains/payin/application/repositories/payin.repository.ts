import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { PayIn } from '../../domain/entities/payin.entity';

@Injectable()
export class PayInRepository extends Repository<PayIn> {
  constructor(manager: EntityManager) {
    super(PayIn, manager);
  }
}
