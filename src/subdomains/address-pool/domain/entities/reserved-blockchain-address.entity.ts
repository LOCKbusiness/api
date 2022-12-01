import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { BlockchainAddressReservation } from './blockchain-address-reservation.entity';

@Entity()
export class ReservedBlockchainAddress extends BlockchainAddress {
  @OneToOne(() => BlockchainAddressReservation, (reservation) => reservation.address, { nullable: true })
  @JoinColumn()
  reservation: BlockchainAddressReservation;
}
