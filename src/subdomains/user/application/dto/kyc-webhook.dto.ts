import { KycStatus } from '../../domain/enums';

export interface KycWebhookData {
  mail: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  city: string;
  zip: string;
  phone: string;
  kycStatus: KycStatus;
  kycHash: string;
}
