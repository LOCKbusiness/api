import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class SetStakingFeeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  feePercent: number;
}
