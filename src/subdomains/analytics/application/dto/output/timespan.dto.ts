import { ApiPropertyOptional } from '@nestjs/swagger';

export class TimespanDto {
  @ApiPropertyOptional({
    description: 'From date',
  })
  dateFrom: Date;

  @ApiPropertyOptional({
    description: 'To date',
  })
  dateTo: Date;
}
