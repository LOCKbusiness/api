import { EntityRepository, Repository } from 'typeorm';
import { TransactionCache } from '../../domain/entities/transaction-cache.entity';

@EntityRepository(TransactionCache)
export class TransactionCacheRepository extends Repository<TransactionCache> {}
