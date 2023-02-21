import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class StakingAnalyticsFilterQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional({ enum: Blockchain })
  @IsOptional()
  @IsEnum(Blockchain)
  blockchain?: Blockchain;

  @ApiPropertyOptional({ enum: StakingStrategy })
  @IsOptional()
  @IsEnum(StakingStrategy)
  strategy?: StakingStrategy;
}
