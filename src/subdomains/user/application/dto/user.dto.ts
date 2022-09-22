import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class UserDto {
  @ApiPropertyOptional({
    description: 'Address of the user',
  })
  @IsOptional()
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Mail of the user',
  })
  @IsOptional()
  @IsString()
  mail: string;

  @ApiPropertyOptional({
    description: 'Language of the user',
  })
  @IsOptional()
  @IsString()
  language: string;

  @ApiProperty({
    description: 'KycStatus of the user',
  })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @ApiProperty({
    description: 'KycHash of the user',
  })
  @IsOptional()
  @IsString()
  kycLink: string;
}
