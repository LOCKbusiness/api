import { IEntity } from 'src/shared/entities/entity';
import { Entity } from 'typeorm';

@Entity()
export class User extends IEntity {}
