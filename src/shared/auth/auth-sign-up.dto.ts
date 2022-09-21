import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { GetConfig } from 'src/config/config';

export class SignUpDto {
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

  @ApiPropertyOptional({
    description: 'Used wallet for login',
  })
  @IsNotEmpty()
  @IsString()
  walletName: string;
}
