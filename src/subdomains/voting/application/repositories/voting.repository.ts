import { Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { Vote } from '../../domain/entities/vote.entity';
import { VoteStatus } from '../../domain/enums';

@Injectable()
export class VoteRepository extends Repository<Vote> {
  constructor(manager: EntityManager) {
    super(Vote, manager);
  }

  async getByStatuses(statuses: VoteStatus[]): Promise<Vote[]> {
    return this.findBy({ status: In(statuses) });
  }
}
