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
    description: 'Type of the asset',
    enum: AssetType,
  })
  type: AssetType;

  @ApiProperty({
    description: 'Category of the asset',
    enum: AssetCategory,
  })
  category: AssetCategory;

  @ApiProperty({
    description: 'Associated blockchain of the asset',
    enum: Blockchain,
  })
  blockchain: Blockchain;

  @ApiProperty({
    description: 'Indicates if an asset can be bought',
  })
  buyable: boolean;

  @ApiProperty({
    description: 'Indicates if an asset can be sold',
  })
  sellable: boolean;
}
