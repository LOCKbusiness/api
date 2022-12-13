import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { RewardStatus } from 'src/subdomains/staking/domain/enums';

export class CreateRewardDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  referenceAssetId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  inputReferenceAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  outputReferenceAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  feePercent: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  feeAmount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  rewardRouteId: number;

  @ApiProperty()
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  txId?: string;

  @ApiProperty()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  outputDate?: Date;
}
