import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateMasternodeDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsString()
  signedTx: string;
}
