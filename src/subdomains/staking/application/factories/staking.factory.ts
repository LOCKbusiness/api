import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetQuery, AssetService } from 'src/shared/models/asset/asset.service';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { ReservableBlockchainAddress } from '../../../address-pool/domain/entities/reservable-blockchain-address.entity';
import { Staking, StakingTypes } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { RewardRoute } from '../../domain/entities/reward-route.entity';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { StakingStrategyValidator } from '../validators/staking-strategy.validator';
import { StakingStrategy } from '../../domain/enums';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Util } from 'src/shared/util';
import { RewardStrategy } from '../../domain/entities/reward-strategy.entity';
import { RewardRouteRepository } from '../repositories/reward-route.repository';

@Injectable()
export class StakingFactory {
  constructor(private readonly assetService: AssetService, private readonly rewardRouteRepo: RewardRouteRepository) {}

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

  async createDeposit(staking: Staking, dto: CreateDepositDto): Promise<Deposit> {
    const assetSpec = StakingStrategyValidator.validate(staking.strategy, dto.asset, staking.blockchain);
    const asset = await this.assetService.getAssetByQuery(assetSpec);
    return Deposit.create(staking, dto.amount, dto.txId, asset);
  }

  async createWithdrawalDraft(staking: Staking, dto: CreateWithdrawalDraftDto): Promise<Withdrawal> {
    const assetSpec = StakingStrategyValidator.validate(staking.strategy, dto.asset, staking.blockchain);
    const asset = await this.assetService.getAssetByQuery(assetSpec);
    return Withdrawal.create(staking, dto.amount, asset);
  }

  createRewardStrategy(userId: number): RewardStrategy {
    return RewardStrategy.create(userId);
  }

  async createReward(staking: Staking, dto: CreateRewardDto): Promise<Reward> {
    const {
      referenceAssetId,
      inputReferenceAmount,
      outputReferenceAmount,
      feePercent,
      feeAmount,
      rewardRouteId,
      status,
      targetAmount,
      txId,
      outputDate,
    } = dto;

    const referenceAsset = await this.assetService.getAssetById(referenceAssetId);
    const rewardRoute = await this.rewardRouteRepo.findOneBy({ id: rewardRouteId });

    if (!referenceAsset) {
      throw new BadRequestException(
        `Cannot create reward. Provided reference asset ID ${referenceAssetId} not found in the database.`,
      );
    }

    if (!rewardRoute) {
      throw new BadRequestException(
        `Cannot create reward. Provided reward route ID ${rewardRouteId} not found in the database.`,
      );
    }

    return Reward.create(
      staking,
      referenceAsset,
      inputReferenceAmount,
      outputReferenceAmount,
      feePercent,
      feeAmount,
      rewardRoute,
      status,
      targetAmount,
      txId,
      outputDate,
    );
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
