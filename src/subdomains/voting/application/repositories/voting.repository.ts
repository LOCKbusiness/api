import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { EntityManager, In } from 'typeorm';
import { Vote } from '../../domain/entities/vote.entity';
import { VoteStatus } from '../../domain/enums';

@Injectable()
export class VoteRepository extends BaseRepository<Vote> {
  constructor(manager: EntityManager) {
    super(Vote, manager);
  }

  async getByStatuses(statuses: VoteStatus[]): Promise<Vote[]> {
    return this.findBy({ status: In(statuses) });
  }
}
