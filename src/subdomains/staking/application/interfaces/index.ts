import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/models/price';

export const FIAT_PRICE_PROVIDER = 'PriceProvider';

export interface FiatPriceProvider {
  getFiatPrice(fiatName: Fiat, assetName: string): Promise<Price>;
}
