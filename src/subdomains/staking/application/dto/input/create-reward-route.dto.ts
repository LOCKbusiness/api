import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class CreateRewardRouteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  rewardPercent: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  targetAssetName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  targetAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum([Blockchain.DEFICHAIN])
  targetBlockchain = Blockchain.DEFICHAIN;
}
