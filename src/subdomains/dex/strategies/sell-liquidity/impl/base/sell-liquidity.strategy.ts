import { Asset } from 'src/shared/entities/asset.entity';
import { LiquidityOrder } from 'src/subdomains/dex/entities/liquidity-order.entity';
import { SellLiquidityRequest } from '../../../../interfaces';
import { SellLiquidityStrategyAlias } from '../../sell-liquidity.facade';
import { LockLogger } from 'src/shared/services/lock-logger';

export abstract class SellLiquidityStrategy {
  private readonly logger = new LockLogger(SellLiquidityStrategy);
  private _name: SellLiquidityStrategyAlias;
  private _feeAsset: Asset;

  constructor(name: SellLiquidityStrategyAlias) {
    this._name = name;
  }

  async feeAsset(): Promise<Asset> {
    return (this._feeAsset ??= await this.getFeeAsset());
  }

  abstract sellLiquidity(request: SellLiquidityRequest): Promise<void>;
  abstract addSellData(order: LiquidityOrder): Promise<void>;
  protected abstract getFeeAsset(): Promise<Asset>;

  protected async handleSellLiquidityError(request: SellLiquidityRequest, e: Error): Promise<void> {
    const { name, blockchain, type } = request.sellAsset;

    const errorMessage = `Error while trying to sell liquidity of ${name} ${blockchain} ${type}`;
    this.logger.error(errorMessage, e);

    throw new Error(errorMessage);
  }

  //*** GETTERS ***//

  get name(): string {
    return this._name;
  }
}
