import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { LiquidityOrder } from '../entities/liquidity-order.entity';

@Injectable()
export class LiquidityOrderRepository extends Repository<LiquidityOrder> {
  constructor(manager: EntityManager) {
    super(LiquidityOrder, manager);
  }
}
