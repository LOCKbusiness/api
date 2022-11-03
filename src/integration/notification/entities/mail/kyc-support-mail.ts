import { GetConfig } from 'src/config/config';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { NotificationMetadata, NotificationOptions } from '../notification.entity';
import { Mail } from './base/mail';

export interface KycSupportMailInput {
  user: User;
}

export interface KycSupportMailParams {
  userDataId: number;
  kycStatus: string;
  metadata?: NotificationMetadata;
  options?: NotificationOptions;
}

export class KycSupportMail extends Mail {
  constructor(params: KycSupportMailParams) {
    const _params = {
      to: GetConfig().mail.contact.supportMail,
      subject: 'KYC failed or expired',
      salutation: 'Hi LOCK Support',
      body: KycSupportMail.createBody(params),
      metadata: params.metadata,
      options: params.options,
    };

    super(_params);
  }

  static createBody(params: KycSupportMailParams): string {
    const { userDataId, kycStatus } = params;

    return `
    <p>a customer has failed or expired during progress ${kycStatus}.</p>
      <table>
          <tr>
              <td>Reference:</td>
              <td>${userDataId}</td>
          </tr>
      </table>
    `;
  }
}
