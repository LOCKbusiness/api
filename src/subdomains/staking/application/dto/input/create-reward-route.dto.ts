import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { GetConfig } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class CreateRewardRouteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  rewardPercent: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  targetAsset: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(GetConfig().addressFormat)
  targetAddress: string;

  @ApiProperty({ enum: [Blockchain.DEFICHAIN] })
  @IsNotEmpty()
  @IsEnum({ [Blockchain.DEFICHAIN]: Blockchain.DEFICHAIN })
  targetBlockchain: Blockchain;
}
