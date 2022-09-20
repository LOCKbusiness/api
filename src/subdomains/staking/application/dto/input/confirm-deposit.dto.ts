import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmDepositDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  txId: string;
}
