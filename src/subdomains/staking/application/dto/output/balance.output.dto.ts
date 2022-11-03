import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class BalanceOutputDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  asset: string;

  @ApiProperty({ enum: Blockchain })
  blockchain: Blockchain;
}
