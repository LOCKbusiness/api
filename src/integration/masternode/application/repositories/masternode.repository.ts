import { EntityRepository, Repository } from 'typeorm';
import { Masternode } from '../../domain/entities/masternode.entity';

@EntityRepository(Masternode)
export class MasternodeRepository extends Repository<Masternode> {}
