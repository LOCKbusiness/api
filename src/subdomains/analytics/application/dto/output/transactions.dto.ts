import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}
