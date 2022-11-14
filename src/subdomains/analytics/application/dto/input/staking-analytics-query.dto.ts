import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

export class StakingAnalyticsQuery {
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  asset: string = 'DFI';

  @ApiProperty({ enum: Blockchain })
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain = Blockchain.DEFICHAIN;

  @ApiProperty({ enum: StakingStrategy })
  @IsNotEmpty()
  @IsEnum(StakingStrategy)
  strategy: StakingStrategy = StakingStrategy.MASTERNODE;
}
