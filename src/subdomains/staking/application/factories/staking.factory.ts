import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { ReservedBlockchainAddress } from '../../../address-pool/domain/entities/reserved-blockchain-address.entity';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { RewardRoute } from '../../domain/entities/reward-route.entity';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { RewardRouteRepository } from '../repositories/reward-route.repository';

@Injectable()
export class StakingFactory {
  constructor(private readonly assetService: AssetService, private readonly rewardRouteRepo: RewardRouteRepository) {}

  async createStaking(
    userId: number,
    type: StakingType,
    depositAddress: ReservedBlockchainAddress,
    withdrawalAddress: BlockchainAddress,
  ): Promise<Staking> {
    return Staking.create(userId, type, depositAddress.address, withdrawalAddress);
  }

  createDeposit(staking: Staking, dto: CreateDepositDto): Deposit {
    const { amount, txId } = dto;

    return Deposit.create(staking, amount, txId);
  }

  createWithdrawalDraft(staking: Staking, dto: CreateWithdrawalDraftDto): Withdrawal {
    const { amount } = dto;

    return Withdrawal.create(staking, amount);
  }

  async createReward(staking: Staking, dto: CreateRewardDto): Promise<Reward> {
    const { referenceAssetId, inputReferenceAmount, outputReferenceAmount, feePercent, feeAmount, rewardRouteId } = dto;

    const referenceAsset = await this.assetService.getAssetById(referenceAssetId);
    const rewardRoute = await this.rewardRouteRepo.findOne(rewardRouteId);

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
    );
  }

  createRewardRoute(staking: Staking, dto: CreateRewardRouteDto, supportedAssets: Asset[]): RewardRoute {
    const { label, rewardPercent, targetAssetName, targetAddress: targetAddressName, targetBlockchain } = dto;

    const targetAsset =
      targetAssetName === 'DFI'
        ? supportedAssets.find(
            (a) => a.name === targetAssetName && a.blockchain === targetBlockchain && a.type === AssetType.COIN,
          )
        : supportedAssets.find((a) => a.name === targetAssetName && a.blockchain === targetBlockchain);

    if (!targetAsset) {
      throw new BadRequestException(
        `Cannot create reward route. Asset ${targetAssetName} at blockchain ${targetBlockchain} is not supported.`,
      );
    }

    const targetAddress = BlockchainAddress.create(targetAddressName, targetBlockchain);

    return RewardRoute.create(staking, label, rewardPercent, targetAsset, targetAddress);
  }
}
