import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, Index } from 'typeorm';
import { TransactionType } from '../enums';

@Entity()
@Index((tc: TransactionCache) => [tc.type, tc.correlationId], { unique: true })
export class TransactionCache extends IEntity {
  @Column()
  type: TransactionType;

  @Column()
  correlationId: string;

  @Column({ length: 'MAX' })
  rawTx: string;
}
