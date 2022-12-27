import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentWebhookType {
  FIAT_CRYPTO = 'FiatCrypto',
  CRYPTO_CRYPTO = 'CryptoCrypto',
  CRYPTO_FIAT = 'CryptoFiat',
  FIAT_FIAT = 'FiatFiat',
}

export enum PaymentWebhookState {
  CREATED = 'Created',
  COMPLETED = 'Completed',
}

export class PaymentWebhookData {
  @ApiProperty({ enum: PaymentWebhookType })
  type: PaymentWebhookType;

  @ApiProperty({ enum: PaymentWebhookState })
  state: PaymentWebhookState;

  @ApiProperty()
  inputAmount: number;

  @ApiProperty()
  inputAsset: string;

  @ApiPropertyOptional()
  outputAmount: number;

  @ApiPropertyOptional()
  outputAsset: string;

  @ApiProperty()
  paymentReference: string;

  @ApiProperty()
  dfxReference: number;
}
