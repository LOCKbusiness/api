import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BaseRepository } from './base.repository';

export abstract class LockedRepository<T> extends BaseRepository<T> {
  async updateWithLock(id: number, update: Partial<T>, relations: string[] = []): Promise<T> {
    return this.saveWithLock(id, (staking) => Object.assign(staking, update), relations);
  }

  /**
   * @warning
   *  To avoid deadlocks, use the manager to do DB calls during the update
   */
  async saveWithLock(
    id: number,
    update: (entity: T, manager: EntityManager) => T | Promise<T>,
    relations: string[] = [],
  ): Promise<T> {
    return this.manager.transaction(async (manager) => {
      const entity = await this.getOrThrow(manager, id, relations);
      const updatedEntity = await update(entity, manager);
      return manager.save(updatedEntity);
    });
  }

  private async getOrThrow(manager: EntityManager, id: number, relations: string[]): Promise<T> {
    const query = manager.createQueryBuilder(this.target, 'entity').setLock('pessimistic_write');

    relations.forEach((r) => query.leftJoinAndSelect(...this.relationToJoin(r)));

    const entity = (await query.where('entity.id = :id', { id }).getOne()) as T;

    if (!entity) throw new NotFoundException(`Entity not found`);

    return entity;
  }

  private relationToJoin(relation: string): [string, string] {
    const parts = relation.split('.');
    const target = parts.pop();
    const source = parts.pop() ?? 'entity';

    return [`${source}.${target}`, target];
  }
}
