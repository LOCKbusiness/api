import { ApiProperty } from '@nestjs/swagger';

export class DepositAddressBalanceOutputDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  asset: string;

  @ApiProperty()
  blockchain: string;
}
