import { ApiProperty } from '@nestjs/swagger';

export class SignWithdrawalOutputDto {
  @ApiProperty({
    description: 'Message to sign',
  })
  message: string;
}
