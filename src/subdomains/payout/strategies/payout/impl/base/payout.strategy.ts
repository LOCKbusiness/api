import { Asset } from 'src/shared/entities/asset.entity';
import { FeeResult } from 'src/subdomains/payout/interfaces';
import { PayoutOrder } from '../../../../entities/payout-order.entity';

export abstract class PayoutStrategy {
  private _feeAsset: Asset;

  async feeAsset(): Promise<Asset> {
    return (this._feeAsset ??= await this.getFeeAsset());
  }

  abstract doPayout(orders: PayoutOrder[]): Promise<void>;
  abstract checkPayoutCompletionData(orders: PayoutOrder[]): Promise<void>;
  abstract estimateFee(quantityOfTransactions: number, asset: Asset): Promise<FeeResult>;
  protected abstract getFeeAsset(): Promise<Asset>;
}
