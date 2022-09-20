import { KycStatus } from '../../domain/enums';

export interface KycDataDto {
  mail: string;
  firstname: string;
  surname: string;
  street: string;
  houseNumber: string;
  location: string;
  zip: string;
  country: string;
  phone: string;
  language: string;
  kycStatus: KycStatus;
  message?: string;
}
