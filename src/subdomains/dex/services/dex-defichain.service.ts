import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { DeFiChainUtil } from 'src/blockchain/ain/utils/defichain.util';
import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Asset, AssetCategory } from 'src/shared/entities/asset.entity';
import { SettingService } from 'src/shared/services/setting.service';
import { Util } from 'src/shared/util';
import { ChainSwapId, LiquidityOrder } from '../entities/liquidity-order.entity';
import { NotEnoughLiquidityException } from '../exceptions/not-enough-liquidity.exception';
import { PriceSlippageException } from '../exceptions/price-slippage.exception';
import { LiquidityOrderRepository } from '../repositories/liquidity-order.repository';

export interface DexDeFiChainLiquidityResult {
  targetAmount: number;
  availableAmount: number;
  maxPurchasableAmount: number;
  isSlippageDetected: boolean;
  slippageMessage: string;
  feeAmount: number;
}

@Injectable()
export class DexDeFiChainService {
  #dexClient: DeFiClient;

  constructor(
    private readonly liquidityOrderRepo: LiquidityOrderRepository,
    private readonly deFiChainUtil: DeFiChainUtil,
    private readonly settingService: SettingService,
    readonly nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.REW).subscribe((client) => (this.#dexClient = client));
  }

  // *** PUBLIC API *** //

  async getAndCheckAvailableTargetLiquidity(
    sourceAsset: Asset,
    sourceAmount: number,
    targetAsset: Asset,
    maxSlippage: number,
    purchaseAssets: Asset[],
  ): Promise<DexDeFiChainLiquidityResult> {
    const targetAmount = await this.getTargetAmount(sourceAsset, sourceAmount, targetAsset);

    const availableAmount = await this.getAssetAvailability(targetAsset);
    const maxPurchasableAmount = await this.getMaxPurchasableAmount(purchaseAssets, targetAsset);
    const [isSlippageDetected, slippageMessage] = await this.checkTestSwapPriceSlippage(
      sourceAsset,
      sourceAmount,
      targetAsset,
      targetAmount,
      maxSlippage,
    );

    return {
      targetAmount,
      availableAmount: availableAmount,
      maxPurchasableAmount,
      isSlippageDetected,
      slippageMessage,
      feeAmount: 0,
    };
  }

  async swapLiquidity(
    swapAsset: Asset,
    swapAmount: number,
    targetAsset: Asset,
    maxSlippage: number,
  ): Promise<ChainSwapId> {
    const maxPrice = await this.getMaxPriceForPurchaseLiquidity(swapAsset, targetAsset, maxSlippage);

    try {
      return await this.#dexClient.compositeSwap(
        Config.blockchain.default.rew.address,
        swapAsset.name,
        Config.blockchain.default.rew.address,
        targetAsset.name,
        swapAmount,
        [],
        maxPrice,
      );
    } catch (e) {
      if (this.isCompositeSwapSlippageError(e)) {
        throw new PriceSlippageException(
          `Price is higher than indicated. Composite swap ${swapAmount} ${swapAsset.name} to ${targetAsset.name}. Maximum price for asset ${targetAsset.name} is ${maxPrice} ${swapAsset.name}.`,
        );
      }

      throw e;
    }
  }

  async sellDfiCoin(amount: number): Promise<string> {
    return this.#dexClient.toToken(Config.blockchain.default.rew.address, amount);
  }

  async addPoolLiquidity(poolPair: [string, string]): Promise<string> {
    return this.#dexClient.addPoolLiquidity(Config.blockchain.default.rew.address, poolPair);
  }

  async transferLiquidity(addressFrom: string, addressTo: string, asset: string, amount: number): Promise<string> {
    return this.#dexClient.sendToken(addressFrom, addressTo, asset, amount);
  }

  async transferMinimalUtxo(address: string): Promise<string> {
    return this.#dexClient.sendToken(
      Config.blockchain.default.rew.address,
      address,
      'DFI',
      Config.payIn.min.DeFiChain.coin / 2,
    );
  }

  async checkTransferCompletion(transferTxId: string): Promise<boolean> {
    const transaction = await this.#dexClient.getTx(transferTxId);

    return transaction && transaction.blockhash && transaction.confirmations > 0;
  }

  async getSwapAmount(txId: string, asset: string): Promise<number> {
    const historyEntry = await this.deFiChainUtil.getHistoryEntryForTx(
      txId,
      this.#dexClient,
      Config.blockchain.default.rew.address,
    );

    if (!historyEntry) {
      throw new Error(`Could not find transaction with ID: ${txId} while trying to extract purchased liquidity`);
    }

    const amounts = historyEntry.amounts.map((a) => this.#dexClient.parseAmount(a));

    const { amount: purchasedAmount } = amounts.find((a) => a.asset === asset);

    if (!purchasedAmount) {
      throw new Error(`Failed to get amount for TX: ${txId} while trying to extract purchased liquidity`);
    }

    return purchasedAmount;
  }

  async getSwapAmountForPurchase(
    referenceAsset: Asset,
    referenceAmount: number,
    targetAsset: Asset,
    swapAsset: Asset,
  ): Promise<number> {
    const swapAmount = await this.calculateSwapAmountForPurchase(
      referenceAsset,
      referenceAmount,
      swapAsset,
      targetAsset,
    );

    await this.checkAssetAvailability(swapAsset, swapAmount);

    return swapAmount;
  }

  async calculateSwapAmountForPurchase(
    referenceAsset: Asset,
    referenceAmount: number,
    swapAsset: Asset,
    targetAsset?: Asset,
  ): Promise<number> {
    if (referenceAsset.id === targetAsset?.id) {
      const swapAssetPrice = await this.calculatePrice(swapAsset, referenceAsset);

      const swapAmount = referenceAmount * swapAssetPrice;

      // adding 5% cap to liquidity swap to cover meantime referenceAmount price difference (initially taken from Kraken/Binance)
      return Util.round(swapAmount + swapAmount * 0.05, 8);
    }

    return this.testSwap(referenceAsset, swapAsset, referenceAmount);
  }

  async getAssetAvailability(asset: Asset): Promise<number> {
    // can result in negative available amount result, in case of DB and blockchain balance not yet in sync, this is acceptable
    const pendingOrders = (await this.liquidityOrderRepo.findBy({ isComplete: false })).filter(
      (o) => o.targetAsset.name === asset.name && o.targetAsset.blockchain === Blockchain.DEFICHAIN,
    );
    const pendingAmount = Util.sumObj<LiquidityOrder>(pendingOrders, 'estimatedTargetAmount');
    const availableAmount = await this.deFiChainUtil.getAvailableTokenAmount(
      asset.name,
      this.#dexClient,
      Config.blockchain.default.rew.address,
    );

    // adding a small cap to pendingAmount in case testSwap results got slightly outdated by the moment current check is done
    return Util.round(availableAmount - pendingAmount * 1.05, 8);
  }

  async testSwap(sourceAsset: Asset, targetAsset: Asset, amount: number): Promise<number> {
    if (sourceAsset.category !== targetAsset.category) {
      const intermediateAsset = targetAsset.category === AssetCategory.CRYPTO ? 'DFI' : 'DUSD';

      const dfiAmount = await this.#dexClient.testCompositeSwap(sourceAsset.name, intermediateAsset, amount);
      return this.#dexClient.testCompositeSwap(intermediateAsset, targetAsset.name, dfiAmount);
    } else {
      return this.#dexClient.testCompositeSwap(sourceAsset.name, targetAsset.name, amount);
    }
  }

  //*** GETTERS ***//

  get stakingWalletAddress(): string {
    return Config.blockchain.default.rew.address;
  }

  // *** HELPER METHODS *** //

  private async getTargetAmount(sourceAsset: Asset, sourceAmount: number, targetAsset: Asset): Promise<number> {
    return targetAsset.id === sourceAsset.id ? sourceAmount : this.testSwap(sourceAsset, targetAsset, sourceAmount);
  }

  private async checkAssetAvailability(asset: Asset, requiredAmount: number): Promise<void> {
    const availableAmount = await this.getAssetAvailability(asset);

    if (requiredAmount > availableAmount) {
      throw new NotEnoughLiquidityException(
        `Not enough liquidity of asset ${asset.name}. Trying to use ${requiredAmount} ${asset.name} worth liquidity. Available amount: ${availableAmount}.`,
      );
    }
  }

  private async getMaxPurchasableAmount(swapAssets: Asset[], targetAsset: Asset): Promise<number> {
    let maxPurchasableAmount = 0;

    for (const swapAsset of swapAssets) {
      const purchasableAmount = await this.getPurchasableAmount(swapAsset, targetAsset);
      maxPurchasableAmount = purchasableAmount > maxPurchasableAmount ? purchasableAmount : maxPurchasableAmount;
    }

    return maxPurchasableAmount;
  }

  private async getPurchasableAmount(swapAsset: Asset, targetAsset: Asset): Promise<number> {
    try {
      const availableAmount = await this.getAssetAvailability(swapAsset);

      if (!availableAmount) return 0;

      return await this.testSwap(swapAsset, targetAsset, availableAmount);
    } catch (e) {
      console.warn(
        `Could not find purchasable amount for swapAsset: ${swapAsset.name}, targetAsset: ${targetAsset.name}`,
      );

      return 0;
    }
  }

  private async checkTestSwapPriceSlippage(
    sourceAsset: Asset,
    sourceAmount: number,
    targetAsset: Asset,
    targetAmount: number,
    maxSlippage: number,
  ): Promise<[boolean, string]> {
    // how much sourceAsset we are willing to pay for 1 unit of targetAsset max
    const maxPrice = await this.calculateMaxTargetAssetPrice(sourceAsset, targetAsset, maxSlippage);

    const minimalAllowedTargetAmount = Util.round(sourceAmount / maxPrice, 8);

    const isSlippageDetected = targetAmount > 0.000001 && targetAmount < minimalAllowedTargetAmount;
    const slippageMessage = isSlippageDetected
      ? this.generateSlippageMessage(sourceAsset, sourceAmount, targetAsset, targetAmount, maxPrice)
      : 'no slippage detected';

    return [isSlippageDetected, slippageMessage];
  }

  private generateSlippageMessage(
    sourceAsset: Asset,
    sourceAmount: number,
    targetAsset: Asset,
    targetAmount: number,
    maxPrice: number,
  ): string {
    const actualPrice = Util.round(sourceAmount / targetAmount, 8);

    return `Price is higher than indicated. Test swap ${sourceAmount} ${sourceAsset.name} to ${targetAmount} ${targetAsset.name}. Maximum price for asset ${targetAsset.name} is ${maxPrice} ${sourceAsset.name}. Actual price is ${actualPrice} ${sourceAsset.name}`;
  }

  private async getMaxPriceForPurchaseLiquidity(
    swapAsset: Asset,
    targetAsset: Asset,
    maxSlippage: number,
  ): Promise<number | undefined> {
    return (await this.settingService.get('slippage-protection')) === 'on'
      ? this.calculateMaxTargetAssetPrice(swapAsset, targetAsset, maxSlippage)
      : undefined;
  }

  private async calculateMaxTargetAssetPrice(
    sourceAsset: Asset,
    targetAsset: Asset,
    maxSlippage: number,
  ): Promise<number> {
    // how much of sourceAsset you get for 1 unit of targetAsset
    const targetAssetPrice = await this.calculatePrice(sourceAsset, targetAsset);

    return Util.round(targetAssetPrice * (1 + maxSlippage), 8);
  }

  private async calculatePrice(sourceAsset: Asset, targetAsset: Asset): Promise<number> {
    // how much of sourceAsset you going to pay for 1 unit of targetAsset, caution - only indicative calculation
    return (
      1 /
      ((await this.testSwap(sourceAsset, targetAsset, this.getMinimalPriceReferenceAmount(sourceAsset.name))) /
        this.getMinimalPriceReferenceAmount(sourceAsset.name))
    );
  }

  private isCompositeSwapSlippageError(e: Error): boolean {
    return e.message && e.message.includes('Price is higher than indicated');
  }

  private getMinimalPriceReferenceAmount(sourceAsset: string): number {
    return sourceAsset === 'BTC' ? 0.001 : 1;
  }
}
