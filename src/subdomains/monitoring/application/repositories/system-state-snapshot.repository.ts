import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { SystemStateSnapshot } from '../../domain/entities/system-state-snapshot.entity';

@Injectable()
export class SystemStateSnapshotRepository extends Repository<SystemStateSnapshot> {
  constructor(manager: EntityManager) {
    super(SystemStateSnapshot, manager);
  }
}
