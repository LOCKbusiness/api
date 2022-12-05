import { ApiProperty } from '@nestjs/swagger';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';

export class RewardRouteOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  stakingId: number;

  @ApiProperty()
  label: string;

  @ApiProperty()
  rewardPercent: number;

  @ApiProperty()
  targetAddress: BlockchainAddress;

  @ApiProperty()
  targetAsset: string;
}
