import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from '../enums/blockchain.enum';

export class AuthMessageDto {
  @ApiProperty({
    description: 'Message to sign',
    isArray: false,
  })
  message: string;

  @ApiProperty({
    description: 'List of blockchains',
    isArray: true,
    enum: Blockchain,
  })
  blockchain: Blockchain[];
}
