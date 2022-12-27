import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from '../../domain/enums';

export class KycWebhookData {
  @ApiProperty()
  mail: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  houseNumber: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  zip: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ enum: KycStatus })
  kycStatus: KycStatus;

  @ApiProperty()
  kycHash: string;
}
