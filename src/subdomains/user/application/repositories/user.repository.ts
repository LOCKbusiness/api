import { EntityRepository, Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {}
