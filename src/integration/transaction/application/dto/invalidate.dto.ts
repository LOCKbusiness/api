import { IsOptional, IsString } from 'class-validator';

export class InvalidateDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
