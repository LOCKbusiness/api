import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token of LOCK API',
    isArray: false,
  })
  @IsString()
  accessToken: string;
}
