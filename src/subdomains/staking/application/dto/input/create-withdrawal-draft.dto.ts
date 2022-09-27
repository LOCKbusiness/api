import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateWithdrawalDraftDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
