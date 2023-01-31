import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class GetOrCreateStakingQuery {
  @ApiProperty({ enum: Blockchain })
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain;

  @ApiProperty({ enum: StakingStrategy })
  @IsNotEmpty()
  @IsEnum(StakingStrategy)
  strategy: StakingStrategy = StakingStrategy.MASTERNODE;
}
