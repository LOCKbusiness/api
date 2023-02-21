import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class StakingAnalyticsFilterQuery {
  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((b) => b.asset)
  asset?: string;

  @ApiPropertyOptional({ enum: Blockchain })
  @IsNotEmpty()
  @IsEnum(Blockchain)
  @ValidateIf((b) => b.blockchain)
  blockchain?: Blockchain;

  @ApiPropertyOptional({ enum: StakingStrategy })
  @IsNotEmpty()
  @IsEnum(StakingStrategy)
  @ValidateIf((b) => b.strategy)
  strategy?: StakingStrategy;
}
