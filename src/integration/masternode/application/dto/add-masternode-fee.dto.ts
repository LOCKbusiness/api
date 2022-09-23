import { IsNotEmpty, IsNumber } from 'class-validator';

export class AddMasternodeFee {
  @IsNotEmpty()
  @IsNumber()
  feeAmount: number;
}
