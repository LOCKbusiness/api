import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
