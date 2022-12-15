import { NotFoundException } from '@nestjs/common';
import { EntityManager, EntityTarget, getConnection, Repository } from 'typeorm';

abstract class RestrictedRepository<T> {
  protected readonly manager: EntityManager;

  readonly find = this.repo.find;
  readonly findOne = this.repo.findOne;
  readonly findByIds = this.repo.findByIds;
  readonly findAndCount = this.repo.findAndCount;
  readonly findOneOrFail = this.repo.findOneOrFail;

  readonly createQueryBuilder = this.repo.createQueryBuilder;

  constructor(private readonly repo: Repository<T>) {
    this.manager = this.repo.manager;
  }
}

export abstract class LockedRepository<T> extends RestrictedRepository<T> {
  constructor(private readonly target: EntityTarget<T>) {
    super(getConnection().getRepository(target));
  }

  async updateWithLock(id: number, update: Partial<T>): Promise<T> {
    return await this.manager.transaction(async (manager) => {
      const entity = await manager
        .createQueryBuilder(this.target, 'entity')
        .setLock('pessimistic_write')
        .where('id = :id', { id })
        .getOne();

      if (!entity) throw new NotFoundException(`Entity not found`);

      const updatedEntity = Object.assign(entity, update);
      return await manager.save(updatedEntity);
    });
  }

  async saveWithLock(id: number, update: (entity: T, manager: EntityManager) => T | Promise<T>): Promise<T> {
    return await this.manager.transaction(async (manager) => {
      const entity = await manager
        .createQueryBuilder(this.target, 'entity')
        .setLock('pessimistic_write')
        .where('id = :id', { id })
        .getOne();

      if (!entity) throw new NotFoundException(`Entity not found`);

      const updatedEntity = await update(entity, manager);
      return await manager.save(updatedEntity);
    });
  }

  async insert(entity: T): Promise<T> {
    return await this.manager.save(entity);
  }
}
