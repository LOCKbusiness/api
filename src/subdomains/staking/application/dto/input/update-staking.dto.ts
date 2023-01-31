import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateStakingDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  assetId: number;
}
