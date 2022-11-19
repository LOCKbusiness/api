import { ApiProperty } from '@nestjs/swagger';
import { Distribution } from './distribution.dto';

export class CfpResultDto {
  @ApiProperty()
  number: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: Distribution })
  result: Distribution;
}
