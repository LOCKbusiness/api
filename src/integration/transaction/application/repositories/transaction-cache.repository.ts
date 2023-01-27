import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { TransactionCache } from '../../domain/entities/transaction-cache.entity';

@Injectable()
export class TransactionCacheRepository extends Repository<TransactionCache> {
  constructor(manager: EntityManager) {
    super(TransactionCache, manager);
  }
}
