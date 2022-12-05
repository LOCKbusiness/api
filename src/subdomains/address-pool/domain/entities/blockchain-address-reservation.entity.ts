import { IEntity } from 'src/shared/models/entity';
import { Entity, OneToOne } from 'typeorm';
import { ReservedBlockchainAddress } from './reserved-blockchain-address.entity';

@Entity()
export class BlockchainAddressReservation extends IEntity {
  @OneToOne(() => ReservedBlockchainAddress, (address) => address.reservation, { nullable: false })
  address: ReservedBlockchainAddress;

  //*** FACTORY METHODS ***//

  static create(address: ReservedBlockchainAddress): BlockchainAddressReservation {
    const reservation = new BlockchainAddressReservation();

    reservation.address = address;

    return reservation;
  }
}
