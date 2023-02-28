import { IsOptional } from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  approxPriceUsd: number;
}
