import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalDraftOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({
    description: 'Message to sign',
  })
  signMessage: string;
}
