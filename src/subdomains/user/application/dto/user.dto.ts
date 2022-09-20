import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class UserDto {
  @ApiPropertyOptional({
    description: 'Address from the user',
  })
  @IsOptional()
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Mail from the user',
  })
  @IsOptional()
  @IsString()
  mail: string;

  @ApiPropertyOptional({
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
