import { ApiProperty } from '@nestjs/swagger';
import { Asset } from 'src/shared/models/asset/asset.entity';

export class DepositAddressBalanceOutputDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  asset: Asset;
}
