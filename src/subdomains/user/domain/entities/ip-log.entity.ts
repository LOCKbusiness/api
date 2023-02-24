import { IEntity } from 'src/shared/models/entity';
import { Entity, Column } from 'typeorm';

@Entity()
export class IpLog extends IEntity {
  @Column()
  address: string;

  @Column()
  ip: string;

  @Column({ nullable: true })
  country: string;

  @Column()
  url: string;

  @Column()
  result: boolean;
}
