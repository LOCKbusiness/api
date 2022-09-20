import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class KycDataDto {
  @ApiProperty()
  @IsString()
  mail: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  surname: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  houseNumber: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsString()
  zip: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message?: string;
}
