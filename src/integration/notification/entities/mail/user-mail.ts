import { Config } from 'src/config/config';
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
  date?: number;
  telegramUrl?: string;
  twitterUrl?: string;
  metadata?: NotificationMetadata;
  options?: NotificationOptions;
}

export class UserMail extends Mail {
  constructor(params: UserMailParams) {
    const defaultParams: Partial<UserMailParams> = {
      twitterUrl: Config.defaultTwitterUrl,
      telegramUrl: Config.defaultTelegramUrl,
      date: new Date().getFullYear(),
    };

    super({ ...params, template: 'default', templateParams: { ...defaultParams, ...params } });
  }
}
