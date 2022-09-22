import { IsNotEmpty, IsString } from 'class-validator';

export class PrepareResignMasternodeDto {
  @IsNotEmpty()
  @IsString()
  signature: string;
}
