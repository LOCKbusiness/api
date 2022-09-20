import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class UserDto {
  @ApiProperty({
    description: 'Address from the user',
  })
  @IsOptional()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Mail from the user',
  })
  @IsOptional()
  @IsString()
  mail: string;

  @ApiProperty({
    description: 'Language from the user',
  })
  @IsOptional()
  @IsString()
  language: string;

  @ApiProperty({
    description: 'KycStatus from the user',
  })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @ApiProperty({
    description: 'KycHash from the user',
  })
  @IsOptional()
  @IsString()
  kycHash: string;
}
