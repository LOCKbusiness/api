import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { KycStatus } from '../../domain/enums';

export class WalletDetailedDto {
  @ApiProperty({
    description: 'Address of the user',
  })
  address: string;

  @ApiProperty({
    description: 'Blockchain of the user',
    enum: Blockchain,
  })
  blockchain: Blockchain;

  @ApiPropertyOptional({
    description: 'Mail of the user',
  })
  mail: string;

  @ApiPropertyOptional({
    description: 'Phone number of the user',
  })
  phone: string;

  @ApiProperty({
    description: 'Language of the user',
  })
  language: string;

  @ApiProperty({
    description: 'KYC status of the user',
  })
  kycStatus: KycStatus;

  @ApiPropertyOptional({
    description: 'KYC link of the user',
    enum: KycStatus,
  })
  kycLink: string;
}
