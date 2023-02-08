import { ApiProperty } from '@nestjs/swagger';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetCategory, AssetType } from './asset.entity';

export class AssetDto {
  @ApiProperty({
    description: 'Name of the asset',
  })
  name: string;

  @ApiProperty({
    description: 'Display name of the asset',
  })
  displayName: string;

  @ApiProperty({
    description: 'Asset type of the asset',
    enum: AssetType,
  })
  type: AssetType;

  @ApiProperty({
    description: 'Asset category of the asset',
    enum: AssetCategory,
  })
  category: AssetCategory;

  @ApiProperty({
    description: 'Associated blockchain of the asset',
    enum: Blockchain,
  })
  blockchain: Blockchain;
}
