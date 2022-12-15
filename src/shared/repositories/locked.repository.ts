import { NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

export abstract class LockedRepository<T> extends Repository<T> {
  async updateWithLock(id: number, update: Partial<T>): Promise<T> {
    return await this.manager.transaction(async (manager) => {
      const entity = (await manager
        .createQueryBuilder(this.target, 'entity')
        .setLock('pessimistic_write')
        .where('id = :id', { id })
        .getOne()) as T;

      if (!entity) throw new NotFoundException(`Entity not found`);

      const updatedEntity = Object.assign(entity, update);
      return await manager.save(updatedEntity);
    });
  }

  async saveWithLock(id: number, update: (entity: T, manager: EntityManager) => T | Promise<T>): Promise<T> {
    return await this.manager.transaction(async (manager) => {
      const entity = (await manager
        .createQueryBuilder(this.target, 'entity')
        .setLock('pessimistic_write')
        .where('id = :id', { id })
        .getOne()) as T;

      if (!entity) throw new NotFoundException(`Entity not found`);

      const updatedEntity = await update(entity, manager);
      return await manager.save(updatedEntity);
    });
  }
}
