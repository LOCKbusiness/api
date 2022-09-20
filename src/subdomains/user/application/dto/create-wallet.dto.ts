import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { GetConfig } from 'src/config/config';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Address for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().addressFormat)
  address: string;

  @ApiProperty({
    description: 'Signature for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().signatureFormat)
  signature: string;

  @ApiProperty({
    description: 'Used wallet for login',
  })
  @IsOptional()
  @IsInt()
  walletId: number;
}
