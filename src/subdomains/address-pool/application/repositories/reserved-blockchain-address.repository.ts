import { EntityRepository, Repository } from 'typeorm';
import { ReservedBlockchainAddress } from '../../domain/entities/reserved-blockchain-address.entity';

@EntityRepository(ReservedBlockchainAddress)
export class ReservedBlockchainAddressRepository extends Repository<ReservedBlockchainAddress> {}
