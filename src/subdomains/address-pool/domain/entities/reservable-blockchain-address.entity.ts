import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { BlockchainAddressReservation } from './blockchain-address-reservation.entity';

@Entity()
export class ReservableBlockchainAddress extends IEntity {
  @OneToOne(() => BlockchainAddressReservation, (reservation) => reservation.address, { eager: true, nullable: true })
  reservation: BlockchainAddressReservation;

  @Column(() => BlockchainAddress)
  address: BlockchainAddress;
}
