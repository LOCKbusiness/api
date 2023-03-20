import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SettingRepository extends BaseRepository<Setting> {
  constructor(manager: EntityManager) {
    super(Setting, manager);
  }
}
