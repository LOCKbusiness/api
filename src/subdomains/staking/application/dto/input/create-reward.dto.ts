import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

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
}
