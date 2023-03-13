import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { PayIn } from '../../domain/entities/payin.entity';

@Injectable()
export class PayInRepository extends BaseRepository<PayIn> {
  constructor(manager: EntityManager) {
    super(PayIn, manager);
  }
}
