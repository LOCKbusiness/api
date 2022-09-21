import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycResult, KycStatus } from '../../domain/enums';

export class KycWebhookDto {
  @ApiProperty()
  @IsEnum(KycResult)
  result: KycResult;

  @ApiProperty()
  data: KycDataDto;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class KycDataDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  kycId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  mail: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  street: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  houseNumber: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  city: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  zip: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @ApiProperty()
  @IsString()
  kycHash: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  message: string;
}
