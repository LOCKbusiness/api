import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { PayoutOrder } from '../entities/payout-order.entity';

@Injectable()
export class PayoutOrderRepository extends Repository<PayoutOrder> {
  constructor(manager: EntityManager) {
    super(PayoutOrder, manager);
  }
}
