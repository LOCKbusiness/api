import { EntityRepository, Repository } from 'typeorm';
import { SystemStateSnapshot } from '../../domain/entities/system-state-snapshot.entity';

@EntityRepository(SystemStateSnapshot)
export class SystemStateSnapshotRepository extends Repository<SystemStateSnapshot> {}
