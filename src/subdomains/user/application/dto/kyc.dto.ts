import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from '../../domain/enums';

export class KycDto {
  @ApiPropertyOptional({
    description: 'Mail of the user',
  })
  mail: string;

  @ApiPropertyOptional({
    description: 'Language of the user',
  })
  language: string;

  @ApiProperty({
    description: 'KycStatus of the user',
    enum: KycStatus,
  })
  kycStatus: KycStatus;

  @ApiProperty({
    description: 'Kyc link of the user',
  })
  kycLink: string;
}
