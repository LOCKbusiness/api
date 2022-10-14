import { ApiProperty } from '@nestjs/swagger';
import { Asset } from 'src/shared/models/asset/asset.entity';

export class WithdrawalOutputDto {
  @ApiProperty()
  signMessage: string;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  asset: Asset;

  @ApiProperty()
  amount: number;
}
