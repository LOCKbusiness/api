import { EntityRepository, Repository } from 'typeorm';
import { IpLog } from '../../domain/entities/ip-log.entity';

@EntityRepository(IpLog)
export class IpLogRepository extends Repository<IpLog> {}
