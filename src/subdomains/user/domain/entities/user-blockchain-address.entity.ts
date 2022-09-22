import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Entity } from 'typeorm';

@Entity()
export class UserBlockchainAddress extends BlockchainAddress {}
