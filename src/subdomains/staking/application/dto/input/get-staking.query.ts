import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, ValidateIf } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class GetOrCreateStakingQuery {
  // TODO: remove
  @IsNotEmpty()
  @IsString()
  @ValidateIf((o) => o.assetName)
  assetName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((o) => !o.assetName || o.asset)
  asset: string;

  @ApiProperty({ enum: Blockchain })
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain;

  @ApiProperty({ enum: StakingStrategy })
  @IsNotEmpty()
  @IsEnum(StakingStrategy)
  strategy: StakingStrategy = StakingStrategy.MASTERNODE;
}
