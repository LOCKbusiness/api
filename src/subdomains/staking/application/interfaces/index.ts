import { Fiat } from 'src/shared/enums/fiat.enum';
import { Price } from 'src/shared/models/price';

export const PRICE_PROVIDER = 'PRICE_PROVIDER';

export interface PriceProvider {
  getFiatPrice(fiat: Fiat, assetId: number): Promise<Price>;
  getFiatPriceAt(fiat: Fiat, assetId: number, date: Date): Promise<Price>;
  getAvgFiatPrice(fiat: Fiat, assetId: number, from: Date, to: Date): Promise<Price>;

  getExchangePrice(fromAssetId: number, toAssetId: number);
  getExchangePriceAt(fromAssetId: number, toAssetId: number, date: Date);
  getAverageExchangePrice(fromAssetId: number, toAssetId: number, from: Date, to: Date);
}
