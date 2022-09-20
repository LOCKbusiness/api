import { IEntity } from 'src/shared/models/entity';
import { Entity } from 'typeorm';

@Entity()
export class User extends IEntity {}
