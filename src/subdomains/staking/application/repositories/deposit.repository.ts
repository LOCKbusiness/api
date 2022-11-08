import { EntityRepository, Repository } from 'typeorm';
import { Deposit } from '../../domain/entities/deposit.entity';

@EntityRepository(Deposit)
export class DepositRepository extends Repository<Deposit> {}
