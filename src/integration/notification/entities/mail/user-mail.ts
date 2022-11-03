import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { NotificationMetadata, NotificationOptions } from '../notification.entity';
import { Mail } from './base/mail';

export interface UserMailInput {
  user: User;
  translationKey: string;
  translationParams: object;
}

export interface UserMailParams {
  to: string;
  subject: string;
  salutation: string;
  body: string;
  metadata?: NotificationMetadata;
  options?: NotificationOptions;
}

export class UserMail extends Mail {
  constructor(params: UserMailParams) {
    super({ ...params, template: 'default' });
  }
}
