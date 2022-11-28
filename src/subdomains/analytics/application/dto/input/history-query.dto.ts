import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum ExportDataType {
  CSV = 'csv',
  JSON = 'json',
}

export class HistoryQueryBase {
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
}

export class HistoryQueryCompact extends HistoryQueryBase {
  @ApiPropertyOptional({ enum: ExportDataType })
  @IsOptional()
  @IsEnum(ExportDataType)
  type: ExportDataType = ExportDataType.CSV;
}

export class HistoryQueryTaxTools extends HistoryQueryBase {}
