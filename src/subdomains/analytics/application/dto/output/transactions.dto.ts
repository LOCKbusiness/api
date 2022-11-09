import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  asset: string;
}

export class StakingTransactionDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  deposits: TransactionDto[];

  @ApiProperty({ type: TransactionDto, isArray: true })
  withdrawals: TransactionDto[];
}
