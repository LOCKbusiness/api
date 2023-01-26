import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Vote } from '../../domain/entities/vote.entity';

@Injectable()
export class VoteRepository extends Repository<Vote> {
  constructor(manager: EntityManager) {
    super(Vote, manager);
  }
}
