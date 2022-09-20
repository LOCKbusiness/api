import { EntityRepository, Repository } from 'typeorm';
import { PayInCrypto } from '../../domain/entities/payin-crypto.entity';

@EntityRepository(PayInCrypto)
export class PayInCryptoRepository extends Repository<PayInCrypto> {}
