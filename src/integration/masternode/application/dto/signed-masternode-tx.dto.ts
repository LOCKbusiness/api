import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SignedMasternodeTxDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsString()
  signedTx: string;
}
