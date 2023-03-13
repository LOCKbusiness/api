import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager } from 'typeorm';
import { TransactionCache } from '../../domain/entities/transaction-cache.entity';

@Injectable()
export class TransactionCacheRepository extends BaseRepository<TransactionCache> {
  constructor(manager: EntityManager) {
    super(TransactionCache, manager);
  }
}
