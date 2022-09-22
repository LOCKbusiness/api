import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class CreateStakingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  assetName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(Blockchain)
  blockchain: Blockchain;
}
