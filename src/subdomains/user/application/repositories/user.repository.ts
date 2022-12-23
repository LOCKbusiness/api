import { EntityRepository, Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async getByAddress(address: string): Promise<User> {
    return this.createQueryBuilder('user')
      .innerJoin('user.wallets', 'wallets')
      .where('wallets.addressAddress = :address', { address })
      .getOne();
  }
}
