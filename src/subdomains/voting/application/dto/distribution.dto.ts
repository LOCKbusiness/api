import { ApiProperty } from '@nestjs/swagger';

export class Distribution {
  @ApiProperty()
  yes: number;

  @ApiProperty()
  no: number;

  @ApiProperty()
  neutral: number;

  @ApiProperty()
  total: number;
}
