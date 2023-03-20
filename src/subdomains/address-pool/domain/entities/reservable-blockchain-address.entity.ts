import { BlockchainAddress } from 'src/shared/entities/blockchain-address';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, Index, OneToOne } from 'typeorm';
import { BlockchainAddressReservation } from './blockchain-address-reservation.entity';

@Entity()
@Index((r: ReservableBlockchainAddress) => [r.address.address], { unique: true })
export class ReservableBlockchainAddress extends IEntity {
  @OneToOne(() => BlockchainAddressReservation, (reservation) => reservation.address, { eager: true, nullable: true })
  reservation: BlockchainAddressReservation;

  @Column(() => BlockchainAddress)
  address: BlockchainAddress;
}
