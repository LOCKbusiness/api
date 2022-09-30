import { IsNotEmpty, IsString } from 'class-validator';

export class MasternodeManagerDto {
  @IsNotEmpty()
  @IsString()
  ownerWallet: string;
}
