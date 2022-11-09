import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class BalanceQuery {
  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((b: BalanceQuery) => b.userAddress && !b.depositAddress)
  userAddress: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((b: BalanceQuery) => b.depositAddress && !b.userAddress)
  depositAddress: string;
}
