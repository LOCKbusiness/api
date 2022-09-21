import { EntityRepository, Repository } from 'typeorm';
import { PayIn } from '../../domain/entities/payin-crypto.entity';

@EntityRepository(PayIn)
export class PayInRepository extends Repository<PayIn> {}
