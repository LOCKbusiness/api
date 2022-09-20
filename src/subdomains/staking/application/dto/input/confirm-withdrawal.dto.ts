import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsDate, IsString } from 'class-validator';

export class ConfirmWithdrawalDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  outputDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  txId: string;
}
