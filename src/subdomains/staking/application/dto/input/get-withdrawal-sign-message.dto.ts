import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetWithdrawalSignMessageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
