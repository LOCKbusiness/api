import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KycResult, KycStatus } from '../../domain/enums';

export class KycWebhookDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsEnum(KycResult)
  result: KycResult;

  @IsOptional()
  data: KycDataDto;

  @IsOptional()
  @IsString()
  reason: string;
}

export class KycDataDto {
  @IsOptional()
  @IsString()
  mail: string;

  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  street: string;

  @IsOptional()
  @IsString()
  houseNumber: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  zip: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @IsNotEmpty()
  @IsString()
  kycHash: string;
}
