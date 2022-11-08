export class CoinTrackingHistoryBase {
  type: string;
  buyAmount: number;
  buyAsset: string;
  sellAmount: number;
  sellAsset: string;
  fee: number;
  feeAsset: string;
  exchange: string;
  tradeGroup: string;
  comment: string;
  txid: string;
  buyValueInEur: number;
  sellValueInEur: number;
}

export class CoinTrackingCsvHistoryDto extends CoinTrackingHistoryBase {
  date: Date;
}
