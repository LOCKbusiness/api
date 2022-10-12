import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/models/price';

export interface PriceProvider {
  getPriceForFiat(fiatName: Fiat, assetName: string): Promise<Price>;
}
