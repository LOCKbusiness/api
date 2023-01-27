import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(manager: EntityManager) {
    super(User, manager);
  }

  async getByAddress(address: string): Promise<User> {
    return this.createQueryBuilder('user')
      .innerJoin('user.wallets', 'wallets')
      .where('wallets.addressAddress = :address', { address })
      .getOne();
  }
}
