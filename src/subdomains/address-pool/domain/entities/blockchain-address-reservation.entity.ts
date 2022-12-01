import { Entity, OneToOne } from 'typeorm';
import { ReservedBlockchainAddress } from './reserved-blockchain-address.entity';

@Entity()
export class BlockchainAddressReservation {
  @OneToOne(() => ReservedBlockchainAddress, (address) => address.reservation, { nullable: true })
  address: ReservedBlockchainAddress;
}
