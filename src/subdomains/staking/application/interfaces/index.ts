import { Fiat } from 'src/shared/enums/fiat.enum';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { Price } from 'src/shared/models/price';

export interface PriceProvider {
  getPriceForFiat(fiat: Fiat, asset: Asset): Promise<Price>;
}
