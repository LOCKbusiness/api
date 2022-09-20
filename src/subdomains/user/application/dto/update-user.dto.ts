import { IsOptional, IsInt, IsEnum, IsEmail, IsString } from 'class-validator';
import { KycStatus } from '../../domain/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  mail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  houseNumber?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsInt()
  countryId?: number;

  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @IsOptional()
  @IsString()
  kycHash?: string;
}
