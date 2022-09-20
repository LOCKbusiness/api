import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class KycDto {
  @ApiProperty({
    description: 'Mail from the user',
    isArray: false,
  })
  @IsString()
  @IsOptional()
  mail: string;

  @ApiProperty({
    description: 'Language from the user',
    isArray: false,
  })
  @IsString()
  @IsOptional()
  language: string;

  @ApiProperty({
    description: 'KycStatus from the user',
    isArray: false,
  })
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @ApiProperty({
    description: 'KycHash from the user',
    isArray: false,
  })
  @IsNotEmpty()
  @IsString()
  kycHash: string;
}
