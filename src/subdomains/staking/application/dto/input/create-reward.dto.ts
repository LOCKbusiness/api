import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
  targetAssetId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  targetAddress: string;
}
