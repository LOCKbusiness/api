import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class BalanceOutputDto {
  @ApiProperty()
  balance: number;

  @ApiProperty()
  asset: string;

  @ApiProperty({ enum: Blockchain })
  blockchain: Blockchain;

  @ApiProperty({ enum: StakingStrategy })
  stakingStrategy: StakingStrategy;
}
