import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Not } from 'typeorm';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Util } from 'src/shared/util';
import { Lock } from 'src/shared/lock';
import { LiquidityOrderContext, LiquidityOrder } from '../../../entities/liquidity-order.entity';
import { NotEnoughLiquidityException } from '../../../exceptions/not-enough-liquidity.exception';
import { PriceSlippageException } from '../../../exceptions/price-slippage.exception';
import { LiquidityOrderFactory } from '../../../factories/liquidity-order.factory';
import { PurchaseLiquidityRequest } from '../../../interfaces';
import { LiquidityOrderRepository } from '../../../repositories/liquidity-order.repository';
import { DexService } from '../../../services/dex.service';
import { PurchaseLiquidityStrategy } from './base/purchase-liquidity.strategy';
import { DexDeFiChainService } from '../../../services/dex-defichain.service';
import { DexUtil } from '../../../utils/dex.util';
import { PurchaseLiquidityStrategyAlias } from '../purchase-liquidity.facade';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { SettingService } from 'src/shared/services/setting.service';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

@Injectable()
export class DeFiChainPoolPairStrategy extends PurchaseLiquidityStrategy {
  private readonly verifyDerivedOrdersLock = new Lock(1800);

  constructor(
    readonly notificationService: NotificationService,
    private readonly settingService: SettingService,
    private readonly assetService: AssetService,
    private readonly liquidityOrderRepo: LiquidityOrderRepository,
    private readonly liquidityOrderFactory: LiquidityOrderFactory,
    @Inject(forwardRef(() => DexService))
    private readonly dexService: DexService,
    private readonly dexDeFiChainService: DexDeFiChainService,
  ) {
    super(notificationService, PurchaseLiquidityStrategyAlias.DEFICHAIN_POOL_PAIR);
  }

  async purchaseLiquidity(request: PurchaseLiquidityRequest): Promise<void> {
    if ((await this.settingService.get('purchase-poolpair-liquidity')) !== 'on') return;

    const newParentOrder = this.liquidityOrderFactory.createPurchaseOrder(request, Blockchain.DEFICHAIN, this.name);
    const savedParentOrder = await this.liquidityOrderRepo.save(newParentOrder);

    try {
      const [leftAsset, rightAsset] = await this.getAssetPair(request.targetAsset);

      await this.secureLiquidityForPairAsset(savedParentOrder, leftAsset);
      await this.secureLiquidityForPairAsset(savedParentOrder, rightAsset);
    } catch (e) {
      await this.cleanupOrders(savedParentOrder);
      await this.handlePurchaseLiquidityError(e, request);
    }
  }

  async addPurchaseData(order: LiquidityOrder): Promise<void> {
    const amount = await this.dexDeFiChainService.getSwapAmount(order.txId, order.targetAsset.name);

    order.purchased(amount);
    order.recordFee(await this.feeAsset(), 0);
    await this.liquidityOrderRepo.save(order);
  }

  @Interval(30000)
  async verifyDerivedOrders(): Promise<void> {
    if ((await this.settingService.get('purchase-poolpair-liquidity')) !== 'on') return;
    if (!this.verifyDerivedOrdersLock.acquire()) return;

    const pendingParentOrders = await this.liquidityOrderRepo.find({
      context: Not(LiquidityOrderContext.CREATE_POOL_PAIR),
      isReady: false,
    });

    for (const parentOrder of pendingParentOrders) {
      try {
        const derivedOrders = await this.liquidityOrderRepo.find({
          context: LiquidityOrderContext.CREATE_POOL_PAIR,
          correlationId: parentOrder.id.toString(),
          isReady: true,
          isComplete: false,
        });

        if (derivedOrders.length === 2) {
          await this.addPoolPair(parentOrder, derivedOrders);
          await this.dexService.completeOrders(LiquidityOrderContext.CREATE_POOL_PAIR, parentOrder.id.toString());
        }
      } catch (e) {
        console.error(`Error while verifying derived liquidity order. Parent Order ID: ${parentOrder.id}`, e);
        continue;
      }
    }

    this.verifyDerivedOrdersLock.release();
  }

  protected getFeeAsset(): Promise<Asset> {
    return this.assetService.getDfiCoin();
  }

  private async getAssetPair(asset: Asset): Promise<[Asset, Asset]> {
    const assetPair = DexUtil.parseAssetPair(asset);

    const leftAsset = await this.assetService.getAssetByQuery({
      name: assetPair[0],
      blockchain: Blockchain.DEFICHAIN,
      type: AssetType.TOKEN,
    });
    const rightAsset = await this.assetService.getAssetByQuery({
      name: assetPair[1],
      blockchain: Blockchain.DEFICHAIN,
      type: AssetType.TOKEN,
    });

    if (!leftAsset || !rightAsset) {
      throw new Error(
        `Could not find all matching assets for pair ${asset.name}. LeftAsset: ${leftAsset.name}. Right asset: ${rightAsset.name}`,
      );
    }

    return [leftAsset, rightAsset];
  }

  private async secureLiquidityForPairAsset(parentOrder: LiquidityOrder, pairAsset: Asset): Promise<void> {
    // in case of retry - check if a liquidity order was created in a previous try, if yes - prevent creating new one
    const existingOrder = await this.liquidityOrderRepo.findOne({
      context: LiquidityOrderContext.CREATE_POOL_PAIR,
      correlationId: parentOrder.id.toString(),
      targetAsset: pairAsset,
    });

    if (existingOrder) return;

    const request = {
      context: LiquidityOrderContext.CREATE_POOL_PAIR,
      correlationId: parentOrder.id.toString(),
      referenceAsset: parentOrder.referenceAsset,
      referenceAmount: Util.round(parentOrder.referenceAmount / 2, 8),
      targetAsset: pairAsset,
    };

    try {
      await this.dexService.reserveLiquidity(request);
    } catch (e) {
      if (e instanceof NotEnoughLiquidityException) {
        return this.dexService.purchaseLiquidity(request);
      }

      throw e;
    }
  }

  private async addPoolPair(parentOrder: LiquidityOrder, derivedOrders: LiquidityOrder[]): Promise<void> {
    const [leftAsset, rightAsset] = DexUtil.parseAssetPair(parentOrder.targetAsset);

    const leftOrder = derivedOrders.find((o) => o.targetAsset.name === leftAsset);
    const rightOrder = derivedOrders.find((o) => o.targetAsset.name === rightAsset);

    console.info(
      `Creating poolpair token of ${leftOrder.targetAsset.name} ${leftOrder.targetAmount} and ${rightOrder.targetAsset.name} ${rightOrder.targetAmount}`,
    );
    try {
      await this.addPoolLiquidity(
        parentOrder,
        leftOrder.targetAsset.name,
        leftOrder.targetAmount,
        rightOrder.targetAsset.name,
        rightOrder.targetAmount,
      );
    } catch (e) {
      if (this.isPoolPairSlippageError(e)) {
        throw new PriceSlippageException(e.message);
      }

      throw e;
    }

    await this.liquidityOrderRepo.save(parentOrder);
  }

  private async addPoolLiquidity(
    order: LiquidityOrder,
    leftAssetName: string,
    leftAmount: number,
    rightAssetName: string,
    rightAmount: number,
  ): Promise<void> {
    const poolPair: [string, string] = [`${leftAmount}@${leftAssetName}`, `${rightAmount}@${rightAssetName}`];

    const txId = await this.dexDeFiChainService.addPoolLiquidity(poolPair);

    order.addBlockchainTransactionMetadata(txId);

    console.info(
      `Booked poolpair purchase of ${leftAmount} ${leftAssetName} and ${rightAmount} ${rightAssetName} . Context: ${order.context}. CorrelationId: ${order.correlationId}.`,
    );
  }

  private isPoolPairSlippageError(e: Error): boolean {
    return e.message && e.message.includes('Exceeds max ratio slippage protection');
  }

  private async cleanupOrders(parentOrder: LiquidityOrder): Promise<void> {
    console.log(`Pool pair liquidity order failed. Cleaning up parent order ID: ${parentOrder.id}.`);

    await this.liquidityOrderRepo.delete({
      context: LiquidityOrderContext.CREATE_POOL_PAIR,
      correlationId: parentOrder.id.toString(),
    });
    await this.liquidityOrderRepo.delete({ id: parentOrder.id });
  }
}
