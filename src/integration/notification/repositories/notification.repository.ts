import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(manager: EntityManager) {
    super(Notification, manager);
  }
}
