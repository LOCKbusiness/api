import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Setting } from '../models/setting.entity';

@Injectable()
export class SettingRepository extends Repository<Setting> {
  constructor(manager: EntityManager) {
    super(Setting, manager);
  }
}
