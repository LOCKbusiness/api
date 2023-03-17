import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { IpLog } from '../models/ip-log.entity';

@Injectable()
export class IpLogRepository extends Repository<IpLog> {
  constructor(manager: EntityManager) {
    super(IpLog, manager);
  }
}
