import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KycWebhookData } from './kyc-webhook.dto';
import { PaymentWebhookData } from './payment-webhook.dto';

export enum WebhookType {
  PAYMENT = 'Payment',
  KYC_CHANGED = 'KycChanged',
  KYC_FAILED = 'KycFailed',
}

export class WebhookDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsEnum(WebhookType)
  type: WebhookType;

  @IsNotEmpty()
  data: KycWebhookData | PaymentWebhookData;

  @IsOptional()
  @IsString()
  reason: string;
}
