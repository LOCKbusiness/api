import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateWithdrawalDraftDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
