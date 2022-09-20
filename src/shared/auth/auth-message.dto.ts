import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Blockchain } from '../enums/blockchain.enum';

export class AuthMessageDto {
  @ApiProperty({
    description: 'Message to sign',
    isArray: false,
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'List of blockchains',
    isArray: true,
    enum: Blockchain,
  })
  blockchain: Blockchain[];
}
