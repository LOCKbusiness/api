import { KycStatus } from '../../domain/enums';

export interface UserDto {
  address: string;
  mail: string;
  language: string;

  kycStatus: KycStatus;
  kycHash: string;
}
