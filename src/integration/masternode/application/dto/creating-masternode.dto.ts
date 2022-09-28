import { IsNotEmpty, IsString } from 'class-validator';

export class CreatingMasternodeDto {
  @IsNotEmpty()
  @IsString()
  ownerWallet: string;
}
