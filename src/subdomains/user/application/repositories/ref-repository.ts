import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Ref } from '../../domain/entities/ref.entity';

@Injectable()
export class RefRepository extends Repository<Ref> {
  constructor(manager: EntityManager) {
    super(Ref, manager);
  }

  async addOrUpdate(ip: string, ref?: string, origin?: string): Promise<Ref> {
    const entity = (await this.findOneBy({ ip })) ?? this.create({ ip, ref, origin });

    return this.save({ ...entity, ref, origin });
  }

  async getAndRemove(ip: string): Promise<Ref> {
    const ref = await this.findOneBy({ ip });
    if (ref) {
      await this.remove(ref);
    }

    return ref;
  }
}
