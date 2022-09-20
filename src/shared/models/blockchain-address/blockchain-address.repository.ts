import { EntityRepository, Repository } from 'typeorm';
import { BlockchainAddress } from './blockchain-address.entity';

@EntityRepository(BlockchainAddress)
export class BlockchainAddressRepository extends Repository<BlockchainAddress> {}
