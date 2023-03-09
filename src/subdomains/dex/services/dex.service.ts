import { Injectable } from '@nestjs/common';
import { LiquidityOrder, LiquidityOrderContext } from '../entities/liquidity-order.entity';
import { DexDeFiChainService } from './dex-defichain.service';
import { LiquidityOrderRepository } from '../repositories/liquidity-order.repository';
import { PriceSlippageException } from '../exceptions/price-slippage.exception';
import { NotEnoughLiquidityException } from '../exceptions/not-enough-liquidity.exception';
import { LiquidityOrderNotReadyException } from '../exceptions/liquidity-order-not-ready.exception';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { Not, IsNull } from 'typeorm';
import { LiquidityOrderFactory } from '../factories/liquidity-order.factory';
import { CheckLiquidityStrategies } from '../strategies/check-liquidity/check-liquidity.facade';
import {
  CheckLiquidityResult,
  TransferRequest,
  LiquidityTransactionResult,
  PurchaseLiquidityRequest,
  ReserveLiquidityRequest,
  CheckLiquidityRequest,
  SellLiquidityRequest,
} from '../interfaces';
import { PurchaseLiquidityStrategies } from '../strategies/purchase-liquidity/purchase-liquidity.facade';
import { SellLiquidityStrategies } from '../strategies/sell-liquidity/sell-liquidity.facade';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { TransferNotRequiredException } from '../exceptions/transfer-not-required.exception';
import { Config, Process } from 'src/config/config';

@Injectable()
export class DexService {
  private readonly verifyPurchaseOrdersLock = new Lock(1800);

  constructor(
    private readonly checkStrategies: CheckLiquidityStrategies,
    private readonly purchaseStrategies: PurchaseLiquidityStrategies,
    private readonly sellStrategies: SellLiquidityStrategies,
    private readonly dexDeFiChainService: DexDeFiChainService,
    private readonly liquidityOrderRepo: LiquidityOrderRepository,
    private readonly liquidityOrderFactory: LiquidityOrderFactory,
  ) {}

  // *** MAIN PUBLIC API *** //

  async checkLiquidity(request: CheckLiquidityRequest): Promise<CheckLiquidityResult> {
    const { context, correlationId, targetAsset } = request;

    try {
      const strategy = this.checkStrategies.getCheckLiquidityStrategy(targetAsset);

      if (!strategy) {
        throw new Error(
          `No check liquidity strategy for asset ${targetAsset.name} ${targetAsset.type} ${targetAsset.blockchain}`,
        );
      }

      return await strategy.checkLiquidity(request);
    } catch (e) {
      console.error(e.message);

      throw new Error(`Error while checking liquidity. Context: ${context}. Correlation ID: ${correlationId}. `);
    }
  }

  async reserveLiquidity(request: ReserveLiquidityRequest): Promise<number> {
    const { context, correlationId, targetAsset } = request;

    try {
      console.info(`Reserving ${targetAsset.name} liquidity. Context: ${context}. Correlation ID: ${correlationId}`);

      const strategy = this.checkStrategies.getCheckLiquidityStrategy(targetAsset);

      if (!strategy) {
        throw new Error(
          `No check liquidity strategy for asset ${targetAsset.name} ${targetAsset.type} ${targetAsset.blockchain}`,
        );
      }

      const liquidity = await strategy.checkLiquidity(request);

      this.handleCheckLiquidityResult(liquidity);

      const order = this.liquidityOrderFactory.createReservationOrder(request, targetAsset.blockchain);
      order.reserved(liquidity.target.amount);
      order.addEstimatedTargetAmount(liquidity.target.amount);

      await this.liquidityOrderRepo.save(order);

      return order.targetAmount;
    } catch (e) {
      // publicly exposed exceptions
      if (e instanceof NotEnoughLiquidityException) throw e;
      if (e instanceof PriceSlippageException) throw e;

      console.error(e.message);

      // default public exception
      throw new Error(`Error while reserving liquidity. Context: ${context}. Correlation ID: ${correlationId}.`);
    }
  }

  async purchaseLiquidity(request: PurchaseLiquidityRequest): Promise<void> {
    const { context, correlationId, targetAsset } = request;
    const strategy = this.purchaseStrategies.getPurchaseLiquidityStrategy(targetAsset);

    if (!strategy) {
      throw new Error(
        `No purchase liquidity strategy for asset ${targetAsset.name} ${targetAsset.type} ${targetAsset.blockchain}`,
      );
    }

    try {
      console.info(`Purchasing ${targetAsset.name} liquidity. Context: ${context}. Correlation ID: ${correlationId}`);
      await strategy.purchaseLiquidity(request);
    } catch (e) {
      // publicly exposed exception
      if (e instanceof PriceSlippageException) throw e;
      if (e instanceof NotEnoughLiquidityException) throw e;

      console.error(e.message);

      // default public exception
      throw new Error(`Error while purchasing liquidity. Context: ${context}. Correlation ID: ${correlationId}. `);
    }
  }

  async sellLiquidity(request: SellLiquidityRequest): Promise<void> {
    const { context, correlationId, sellAsset } = request;
    const strategy = this.sellStrategies.getSellLiquidityStrategy(sellAsset);

    if (!strategy) {
      throw new Error(
        `No sell liquidity strategy for asset ${sellAsset.name} ${sellAsset.type} ${sellAsset.blockchain}`,
      );
    }

    try {
      console.info(`Selling ${sellAsset.name} liquidity. Context: ${context}. Correlation ID: ${correlationId}`);
      await strategy.sellLiquidity(request);
    } catch (e) {
      // publicly exposed exception
      if (e instanceof PriceSlippageException) throw e;
      if (e instanceof NotEnoughLiquidityException) throw e;

      console.error(e.message);

      // default public exception
      throw new Error(`Error while selling liquidity. Context: ${context}. Correlation ID: ${correlationId}. `);
    }
  }

  async fetchLiquidityTransactionResult(
    context: LiquidityOrderContext,
    correlationId: string,
  ): Promise<LiquidityTransactionResult> {
    const order = await this.liquidityOrderRepo.findOneBy({ context, correlationId });

    if (!order) {
      throw new Error(`Order not found. Context: ${context}. Correlation ID: ${correlationId}.`);
    }

    if (!order.targetAmount) {
      throw new LiquidityOrderNotReadyException(`Order is not ready. Order ID: ${order.id}`);
    }

    return order.getLiquidityTransactionResult();
  }

  async checkOrderReady(
    context: LiquidityOrderContext,
    correlationId: string,
  ): Promise<{ isReady: boolean; purchaseTxId: string }> {
    const order = await this.liquidityOrderRepo.findOneBy({ context, correlationId });

    const purchaseTxId = order && order.txId;
    const isReady = order && order.isReady;

    return { isReady, purchaseTxId };
  }

  async checkOrderCompletion(
    context: LiquidityOrderContext,
    correlationId: string,
  ): Promise<{ isComplete: boolean; purchaseTxId: string }> {
    const order = await this.liquidityOrderRepo.findOneBy({ context, correlationId });

    const purchaseTxId = order && order.txId;
    const isComplete = order && order.isComplete;

    return { isComplete, purchaseTxId };
  }

  async completeOrders(context: LiquidityOrderContext, correlationId: string): Promise<void> {
    const incompleteOrders = await this.liquidityOrderRepo.findBy({
      context,
      correlationId,
      isComplete: false,
      isReady: true,
    });

    for (const order of incompleteOrders) {
      order.complete();
      await this.liquidityOrderRepo.save(order);
    }
  }

  async getPendingOrdersCount(asset: Asset): Promise<number> {
    return this.liquidityOrderRepo.countBy([
      { targetAsset: { id: asset.id }, isComplete: false },
      { targetAsset: { id: asset.id }, isReady: false },
      { swapAsset: { id: asset.id }, isComplete: false },
      { swapAsset: { id: asset.id }, isReady: false },
    ]);
  }

  // *** SUPPLEMENTARY PUBLIC API *** //

  async transferLiquidity(request: TransferRequest): Promise<string> {
    const { destinationAddress, asset, amount } = request;
    const sourceAddress = this.dexDeFiChainService.stakingWalletAddress;

    if (asset.name !== 'DFI' && destinationAddress === sourceAddress) {
      throw new TransferNotRequiredException('Transfer of token to same address is not required/useless');
    }

    return this.dexDeFiChainService.transferLiquidity(sourceAddress, destinationAddress, asset.name, amount);
  }

  async transferMinimalUtxo(address: string): Promise<string> {
    return this.dexDeFiChainService.transferMinimalUtxo(address);
  }

  async checkTransferCompletion(transferTxId: string): Promise<boolean> {
    return this.dexDeFiChainService.checkTransferCompletion(transferTxId);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_30_SECONDS)
  async finalizePurchaseOrders(): Promise<void> {
    if (Config.processDisabled(Process.DEX)) return;
    if (!this.verifyPurchaseOrdersLock.acquire()) return;

    try {
      const standingOrders = await this.liquidityOrderRepo.findBy({
        isReady: false,
        txId: Not(IsNull()),
      });

      await this.addPurchaseDataToOrders(standingOrders);
    } finally {
      this.verifyPurchaseOrdersLock.release();
    }
  }

  // *** HELPER METHODS *** //

  private handleCheckLiquidityResult(liquidity: CheckLiquidityResult): void {
    const { metadata, target } = liquidity;
    if (!metadata.isEnoughAvailableLiquidity) {
      throw new NotEnoughLiquidityException(
        `Not enough liquidity of asset ${target.asset.name}. Available amount: ${target.availableAmount}.`,
      );
    }

    if (metadata.isSlippageDetected) {
      throw new PriceSlippageException(metadata.slippageMessage);
    }
  }

  private async addPurchaseDataToOrders(orders: LiquidityOrder[]): Promise<void> {
    for (const order of orders) {
      try {
        const strategy = this.purchaseStrategies.getPurchaseLiquidityStrategy(order.targetAsset);

        if (!strategy) {
          const { name, blockchain, type } = order.targetAsset;
          throw new Error(`No purchase liquidity strategy for asset ${name} ${blockchain} ${type}`);
        }

        await strategy.addPurchaseData(order);

        console.info(
          `Liquidity purchase is ready. Order ID: ${order.id}. Context: ${order.context}. Correlation ID: ${order.correlationId}`,
        );
      } catch (e) {
        console.error(`Error while trying to add purchase data to liquidity order. Order ID: ${order.id}`, e);
        continue;
      }
    }
  }
}
