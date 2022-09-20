import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { GetConfig } from 'src/config/config';

export class AuthCredentialsDto {
  @ApiProperty({
    description: 'Address for login',
    isArray: false,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().addressFormat)
  address: string;

  @ApiProperty({
    description: 'Signature for login‚',
    isArray: false,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().signatureFormat)
  signature: string;
}
