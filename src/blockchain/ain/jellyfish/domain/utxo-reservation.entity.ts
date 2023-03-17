import { IEntity } from 'src/shared/models/entity';
import { Entity, Column, Index } from 'typeorm';

@Entity()
@Index((ur: UtxoReservation) => [ur.address, ur.utxo], { unique: true })
export class UtxoReservation extends IEntity {
  @Column()
  address: string;

  @Column()
  utxo: string;
}
