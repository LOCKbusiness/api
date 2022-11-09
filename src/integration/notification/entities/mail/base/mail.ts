import { GetConfig } from 'src/config/config';
import { NotificationType } from 'src/integration/notification/enums';
import { Notification, NotificationOptions, NotificationMetadata } from '../../notification.entity';

export interface MailParams {
  to: string | string[];
  subject: string;
  from?: string;
  displayName?: string;
  cc?: string;
  bcc?: string;
  template?: string;
  templateParams?: {
    salutation: string;
    body: string;
    date?: number;
    telegramUrl?: string;
    twitterUrl?: string;
  };
  options?: NotificationOptions;
  metadata?: NotificationMetadata;
}

export class Mail extends Notification {
  readonly #from: { name: string; address: string } = {
    name: 'LOCK.space',
    address: GetConfig().mail.contact.supportMail,
  };
  readonly #to: string | string[];
  readonly #cc: string;
  readonly #bcc: string;
  readonly #template: string = GetConfig().mail.defaultMailTemplate;
  readonly #subject: string;
  readonly #templateParams: { [name: string]: any };

  constructor(params: MailParams) {
    super();
    this.create(NotificationType.MAIL, params.metadata, params.options);

    this.#to = params.to;
    this.#subject = params.subject;
    this.#from = {
      name: params.displayName ?? 'LOCK.space',
      address: params.from ?? GetConfig().mail.contact.supportMail,
    };
    this.#cc = params.cc ?? this.#cc;
    this.#bcc = params.bcc ?? this.#bcc;
    this.#template = params.template ?? this.#template;
    this.#templateParams = params.templateParams;
  }

  get from(): { name: string; address: string } {
    const { name, address } = this.#from;
    return { name, address };
  }

  get to(): string | string[] {
    return this.#to;
  }

  get cc(): string {
    return this.#cc;
  }

  get bcc(): string {
    return this.#bcc;
  }

  get template(): string {
    return this.#template;
  }

  get templateParams(): { [name: string]: any } {
    return this.#templateParams;
  }

  get subject(): string {
    return this.#subject;
  }
}
