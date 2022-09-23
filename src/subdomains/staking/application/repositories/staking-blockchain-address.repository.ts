import { EntityRepository, Repository } from 'typeorm';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';

@EntityRepository(StakingBlockchainAddress)
export class StakingBlockchainAddressRepository extends Repository<StakingBlockchainAddress> {}
