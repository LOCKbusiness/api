import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignWithdrawalDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  signature: string;
}
