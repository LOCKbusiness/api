import { ApiProperty } from '@nestjs/swagger';

export class DepositAddressBalanceOutputDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  asset: string;

  @ApiProperty()
  blockchain: string;
}
