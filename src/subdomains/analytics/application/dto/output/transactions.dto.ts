import { ApiProperty } from '@nestjs/swagger';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class TransactionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  asset: string;

  @ApiProperty({ enum: StakingStrategy })
  stakingStrategy: StakingStrategy;
}

export class StakingTransactionDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  deposits: TransactionDto[];

  @ApiProperty({ type: TransactionDto, isArray: true })
  withdrawals: TransactionDto[];
}
