import { MailerOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Util } from '../util';
import { I18nService } from 'nestjs-i18n';

export interface MailOptions {
  options: MailerOptions;
  defaultMailTemplate: string;
  contact: {
    supportMail: string;
    monitoringMail: string;
    noReplyMail: string;
  };
}

interface SendMailOptions {
  to: string;
  salutation: string;
  subject: string;
  body: string;
  from?: string;
  bcc?: string;
  cc?: string;
  displayName?: string;
  template?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
}

interface KycMailContent {
  salutation: string;
  body: string;
  subject: string;
}

@Injectable()
export class MailService {
  private readonly supportMail = Config.mail.contact.supportMail;
  private readonly monitoringMail = Config.mail.contact.monitoringMail;
  private readonly noReplyMail = Config.mail.contact.noReplyMail;

  constructor(private readonly mailerService: MailerService, private readonly i18n: I18nService) {}

  // --- OTHER --- //
  async sendErrorMail(subject: string, errors: string[]): Promise<void> {
    const env = Config.environment.toUpperCase();

    const body = `
    <p>there seem to be some problems on ${env} API:</p>
    <ul>
      ${errors.reduce((prev, curr) => prev + '<li>' + curr + '</li>', '')}
    </ul>
    `;

    await this.sendMail({
      to: this.monitoringMail,
      salutation: 'Hi LOCK Tech Support',
      subject: `${subject} (${env})`,
      body,
    });
  }

  async sendMail(options: SendMailOptions) {
    try {
      await Util.retry(
        () =>
          this.mailerService.sendMail({
            from: { name: options.displayName ?? 'LOCK.space', address: options.from ?? this.noReplyMail },
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            template: options.template ?? Config.mail.defaultMailTemplate,
            context: {
              salutation: options.salutation,
              body: options.body,
              date: new Date().getFullYear(),
            },
            subject: options.subject,
          }),
        3,
        1000,
      );
    } catch (e) {
      console.error(
        `Exception during send mail: from:${options.from}, to:${options.to}, subject:${options.subject}:`,
        e,
      );
      throw e;
    }
  }

  private async t(key: string, lang: string, args?: any): Promise<KycMailContent> {
    const salutation = await this.i18n.translate(`${key}.salutation`, { lang, args });
    const body = await this.i18n.translate(`${key}.body`, { lang, args });
    const subject = await this.i18n.translate(`${key}.title`, { lang, args });

    return { salutation, body, subject };
  }
}
