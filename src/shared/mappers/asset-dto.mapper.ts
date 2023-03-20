import { AssetDto } from '../__tests__/asset.dto';
import { Asset } from '../entities/asset.entity';

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
