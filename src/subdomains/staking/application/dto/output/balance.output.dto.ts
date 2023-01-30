import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingBalance } from 'src/subdomains/staking/domain/entities/staking.balances.entity';

export class BalanceOutputDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  balances: StakingBalance[];

  @ApiProperty()
  asset: string;

  @ApiProperty({ enum: Blockchain })
  blockchain: Blockchain;
}
