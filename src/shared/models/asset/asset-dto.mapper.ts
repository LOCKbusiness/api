import { AssetDto } from './asset.dto';
import { Asset } from './asset.entity';

export class AssetDtoMapper {
  static entityToDto(asset: Asset): AssetDto {
    const dto = new AssetDto();

    dto.name = asset.name;
    dto.displayName = asset.displayName;
    dto.type = asset.type;
    dto.category = asset.category;
    dto.blockchain = asset.blockchain;
    dto.buyable = asset.buyable;
    dto.sellable = asset.sellable;

    return dto;
  }
}
