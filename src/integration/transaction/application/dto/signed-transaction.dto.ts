import { IsNotEmpty, IsString } from 'class-validator';

export class SignedTransactionDto {
  @IsNotEmpty()
  @IsString()
  hex: string;
}
