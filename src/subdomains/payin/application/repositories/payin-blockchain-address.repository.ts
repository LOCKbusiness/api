import { EntityRepository, Repository } from 'typeorm';
import { PayInBlockchainAddress } from '../../domain/entities/payin-blockchain-address.entity';

@EntityRepository(PayInBlockchainAddress)
export class PayInBlockchainAddressRepository extends Repository<PayInBlockchainAddress> {}
