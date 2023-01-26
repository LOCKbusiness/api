import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Masternode } from '../../domain/entities/masternode.entity';

@Injectable()
export class MasternodeRepository extends Repository<Masternode> {
  constructor(manager: EntityManager) {
    super(Masternode, manager);
  }
}
