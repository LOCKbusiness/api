import { IsNotEmpty, IsString } from 'class-validator';

export class SignatureDto {
  @IsNotEmpty()
  @IsString()
  signature: string;
}
