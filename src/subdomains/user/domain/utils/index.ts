import { KycStatus } from '../enums';

export function KycCompleted(kycStatus: KycStatus): boolean {
  return [KycStatus.LIGHT, KycStatus.FULL].includes(kycStatus);
}

export function KycFulfills(kycStatus: KycStatus, minStatus: KycStatus): boolean {
  return KycLevel[kycStatus] >= KycLevel[minStatus];
}

const KycLevel = {
  [KycStatus.REJECTED]: -1,
  [KycStatus.NA]: 0,
  [KycStatus.LIGHT]: 1,
  [KycStatus.FULL]: 2,
};
