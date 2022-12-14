import { MailerOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { Mail } from '../entities/mail/base/mail';

export interface MailOptions {
  options: MailerOptions;
  defaultMailTemplate: string;
  contact: {
    supportMail: string;
    monitoringMail: string;
  };
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async send(mail: Mail): Promise<void> {
    try {
      await Util.retry(
        () =>
          this.mailerService.sendMail({
            from: mail.from,
            to: mail.to,
            cc: mail.cc,
            bcc: mail.bcc,
            template: mail.template,
            context: mail.templateParams,
            subject: mail.subject,
          }),
        3,
        1000,
      );
    } catch (e) {
      console.error(`Exception during send mail: from:${mail.from}, to:${mail.to}, subject:${mail.subject}:`, e);
      throw e;
    }
  }
}
