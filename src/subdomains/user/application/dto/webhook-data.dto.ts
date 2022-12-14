import { KycWebhookData } from './kyc-webhook.dto';

export enum WebhookType {
  PAYMENT = 'Payment',
  KYC_CHANGED = 'KycChanged',
  KYC_FAILED = 'KycFailed',
}

export interface WebhookDto {
  id: string;
  type: WebhookType;
  data: KycWebhookData;
  reason: string;
}
