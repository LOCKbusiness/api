import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class GetOrCreateStakingQuery {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  assetName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain;
}
