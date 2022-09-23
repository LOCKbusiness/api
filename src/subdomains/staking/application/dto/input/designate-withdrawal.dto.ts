import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DesignateWithdrawalDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  prepareTxId: string;
}
