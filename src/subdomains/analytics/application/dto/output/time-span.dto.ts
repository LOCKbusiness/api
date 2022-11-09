import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class TimeSpanDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'From date',
  })
  dateFrom: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'To date',
  })
  dateTo: Date;
}
