import { EntityRepository, Repository } from 'typeorm';
import { Vote } from '../../domain/entities/vote.entity';

@EntityRepository(Vote)
export class VoteRepository extends Repository<Vote> {}
