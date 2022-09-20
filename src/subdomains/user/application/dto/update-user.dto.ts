import { KycStatus } from '../../domain/enums';

export interface UpdateUserDto {
  mail?: string;
  phone?: string;
  firstName?: string;
  surname?: string;
  street?: string;
  houseNumber?: string;
  location?: string;
  zip?: string;
  countryId?: number;
  kycStatus?: KycStatus;
  kycHash?: string;
}
