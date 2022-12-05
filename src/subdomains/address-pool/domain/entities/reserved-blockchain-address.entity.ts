import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BlockchainAddressReservation } from './blockchain-address-reservation.entity';

@Entity()
export class ReservedBlockchainAddress extends IEntity {
  @OneToOne(() => BlockchainAddressReservation, (reservation) => reservation.address, { eager: true, nullable: true })
  @JoinColumn()
  reservation: BlockchainAddressReservation;

  @Column(() => BlockchainAddress)
  address: BlockchainAddress;

  //*** PUBLIC API ***//

  reserve(reservation: BlockchainAddressReservation): this {
    this.reservation = reservation;

    return this;
  }
}
