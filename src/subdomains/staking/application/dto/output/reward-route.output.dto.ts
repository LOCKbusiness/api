import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class RewardRouteOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  stakingId: number;

  @ApiPropertyOptional()
  label?: string;

  @ApiProperty()
  rewardPercent: number;

  @ApiProperty()
  targetAsset: string;

  @ApiProperty()
  targetAddress: string;

  @ApiProperty()
  targetBlockchain: Blockchain;

  @ApiProperty()
  rewardAsset: string;

  @ApiProperty()
  isReinvest: boolean;
}
