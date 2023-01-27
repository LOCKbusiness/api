import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from '../../domain/entities/wallet.entity';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(manager: EntityManager) {
    super(Wallet, manager);
  }
}
