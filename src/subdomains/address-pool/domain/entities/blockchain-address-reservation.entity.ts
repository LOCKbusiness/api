import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BlockchainAddressReservationPurpose } from '../enums';
import { ReservableBlockchainAddress } from './reservable-blockchain-address.entity';

@Entity()
export class BlockchainAddressReservation extends IEntity {
  @Column({ nullable: false })
  purpose: BlockchainAddressReservationPurpose;

  @OneToOne(() => ReservableBlockchainAddress, (address) => address.reservation, { nullable: false })
  @JoinColumn()
  address: ReservableBlockchainAddress;

  //*** FACTORY METHODS ***//

  static create(
    purpose: BlockchainAddressReservationPurpose,
    address: ReservableBlockchainAddress,
  ): BlockchainAddressReservation {
    const reservation = new BlockchainAddressReservation();

    reservation.purpose = purpose;
    reservation.address = address;

    return reservation;
  }
}
