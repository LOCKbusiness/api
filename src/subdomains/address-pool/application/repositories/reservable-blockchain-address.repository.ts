import { EntityRepository, Repository } from 'typeorm';
import { ReservableBlockchainAddress } from '../../domain/entities/reservable-blockchain-address.entity';

@EntityRepository(ReservableBlockchainAddress)
export class ReservableBlockchainAddressRepository extends Repository<ReservableBlockchainAddress> {}
