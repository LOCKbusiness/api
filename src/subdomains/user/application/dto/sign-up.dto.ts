import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class SignUpDto {
  @ApiProperty({
    description: 'Address for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().addressFormat)
  address: string;

  @ApiProperty({
    description: 'Blockchain for login',
  })
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain;

  @ApiProperty({
    description: 'Signature for login',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().signatureFormat)
  signature: string;

  @ApiPropertyOptional({
    description: 'Used wallet for login',
  })
  @IsNotEmpty()
  @IsString()
  walletName: string;
}
