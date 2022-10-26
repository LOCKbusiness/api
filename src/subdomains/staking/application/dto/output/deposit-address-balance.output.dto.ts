import { ApiProperty } from '@nestjs/swagger';
import { StakingStatus } from 'src/subdomains/staking/domain/enums';

export class DepositAddressBalanceOutputDto {
  @ApiProperty()
  depositAddress: string;

  @ApiProperty()
  balance: number;
}
