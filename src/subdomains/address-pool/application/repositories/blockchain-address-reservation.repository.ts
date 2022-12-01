import { EntityRepository, Repository } from 'typeorm';
import { BlockchainAddressReservation } from '../../domain/entities/blockchain-address-reservation.entity';

@EntityRepository(BlockchainAddressReservation)
export class BlockchainAddressReservationRepository extends Repository<BlockchainAddressReservation> {}
