import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reinvestTxId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  reinvestOutputDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  fee: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amountEur: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amountUsd: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amountChf: number;
}
