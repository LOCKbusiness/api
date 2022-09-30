import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class ResignMasternodeDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsString()
  signedTx: string;
}
