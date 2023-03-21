import { IEntity } from 'src/shared/entities/entity';
import { Entity, Column } from 'typeorm';

@Entity()
export class Ref extends IEntity {
  @Column({ unique: true })
  ip: string;

  @Column({ nullable: true })
  ref?: string;

  @Column({ nullable: true })
  origin?: string;
}
