import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetQuery, AssetService } from 'src/shared/models/asset/asset.service';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { ReservableBlockchainAddress } from '../../../address-pool/domain/entities/reservable-blockchain-address.entity';
import { Staking, StakingTypes } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { RewardRoute } from '../../domain/entities/reward-route.entity';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { StakingStrategyValidator } from '../validators/staking-strategy.validator';
import { StakingStrategy } from '../../domain/enums';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Util } from 'src/shared/util';
import { RewardStrategy } from '../../domain/entities/reward-strategy.entity';

@Injectable()
export class StakingFactory {
  constructor(private readonly assetService: AssetService) {}

  async createStaking(
    userId: number,
    strategy: StakingStrategy,
    blockchain: Blockchain,
    depositAddress: ReservableBlockchainAddress,
    withdrawalAddress: BlockchainAddress,
    rewardStrategy: RewardStrategy,
  ): Promise<Staking> {
    const stakingAssets = await this.assetService.getAssetsByQuery(
      StakingTypes[strategy].filter((a) => a.blockchain === blockchain),
    );

    return Staking.create(
      userId,
      strategy,
      blockchain,
      stakingAssets,
      depositAddress.address,
      withdrawalAddress,
      rewardStrategy,
    );
  }

  async createDeposit(
    staking: Staking,
    asset: string,
    amount: number,
    payInTxId: string,
    payInTxSequence?: number,
  ): Promise<Deposit> {
    const assetSpec = StakingStrategyValidator.validate(staking.strategy, asset, staking.blockchain);
    const assetInst = await this.assetService.getAssetByQuery(assetSpec);
    return Deposit.create(staking, assetInst, amount, payInTxId, payInTxSequence);
  }

  async createWithdrawalDraft(staking: Staking, asset: string, amount: number): Promise<Withdrawal> {
    const assetSpec = StakingStrategyValidator.validate(staking.strategy, asset, staking.blockchain);
    const assetInst = await this.assetService.getAssetByQuery(assetSpec);
    return Withdrawal.create(staking, amount, assetInst);
  }

  createRewardStrategy(userId: number): RewardStrategy {
    return RewardStrategy.create(userId);
  }

  createReward(route: RewardRoute, referenceAsset: Asset): Reward {
    const strategy = referenceAsset.id === 1 ? StakingStrategy.MASTERNODE : StakingStrategy.LIQUIDITY_MINING;

    const staking = route.strategy.stakings.find((s) => s.strategy === strategy);

    const targetAddress = route.isDefault ? staking.depositAddress : route.targetAddress;
    const targetAsset = route.isDefault ? referenceAsset : route.targetAsset;

    return Reward.create(staking, referenceAsset, route, targetAddress, targetAsset);
  }

  createRewardRoute(dto: CreateRewardRouteDto, supportedAssets: Asset[]): RewardRoute {
    const {
      label,
      rewardPercent,
      targetAsset: targetAssetName,
      targetAddress: targetAddressName,
      targetBlockchain,
    } = dto;

    const targetAsset = this.findCoinOrToken(supportedAssets, targetAssetName, targetBlockchain);
    if (!targetAsset || !targetAsset.buyable)
      throw new BadRequestException(`Target asset ${targetAssetName} is not supported`);

    const targetAddress = BlockchainAddress.create(targetAddressName, targetBlockchain);

    return RewardRoute.create(label, Util.round(rewardPercent, 2), targetAsset, targetAddress);
  }

  //*** HELPER METHODS ***//

  private findCoinOrToken(assets: Asset[], name: string, blockchain: Blockchain): Asset | undefined {
    return (
      this.findAsset(assets, { name, blockchain, type: AssetType.COIN }) ??
      this.findAsset(assets, { name, blockchain, type: AssetType.TOKEN })
    );
  }

  private findAsset(assets: Asset[], query: AssetQuery): Asset | undefined {
    return assets.find((a) => a.isEqual(query));
  }
}
