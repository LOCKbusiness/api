import { Asset } from 'src/shared/models/asset/asset.entity';
import { FeeResult } from 'src/subdomains/payout/interfaces';
import { PayoutOrder } from '../../../../entities/payout-order.entity';

export abstract class PrepareStrategy {
  private _feeAsset: Asset;

  async feeAsset(): Promise<Asset> {
    return (this._feeAsset ??= await this.getFeeAsset());
  }

  abstract preparePayout(orders: PayoutOrder[]): Promise<void>;
  abstract checkPreparationCompletion(order: PayoutOrder): Promise<void>;
  abstract estimateFee(asset: Asset): Promise<FeeResult>;
  protected abstract getFeeAsset(): Promise<Asset>;
}
