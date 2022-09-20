// TODO -convert to class with docs annotation
export interface StakingBalanceDto {
  balance: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export class BankAccountDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  iban: string;

  @ApiPropertyOptional({ type: Fiat })
  preferredCurrency: Fiat;

  @ApiPropertyOptional()
  label: string;

  @ApiProperty()
  sepaInstant: boolean;
}
