import { ApiProperty } from '@nestjs/swagger';

export class WithdrawalOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  signMessage: string;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  asset: string;

  @ApiProperty()
  amount: number;
}
