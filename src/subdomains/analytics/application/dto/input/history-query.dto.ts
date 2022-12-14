import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum ExportDataType {
  CSV = 'csv',
  JSON = 'json',
}

export class HistoryQuery {
  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((b) => b.userAddress || !b.depositAddress)
  userAddress: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((b) => b.depositAddress || !b.userAddress)
  depositAddress: string;

  @ApiPropertyOptional({ enum: ExportDataType })
  @IsOptional()
  @IsEnum(ExportDataType)
  type: ExportDataType = ExportDataType.CSV;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;
}
