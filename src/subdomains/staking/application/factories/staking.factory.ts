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

@Injectable()
export class StakingFactory {
  constructor(private readonly assetService: AssetService) {}

  createStaking(
    userId: number,
    type: StakingType,
    depositAddress: ReservedBlockchainAddress,
    withdrawalAddress: BlockchainAddress,
  ): Staking {
    return Staking.create(userId, type, depositAddress, withdrawalAddress);
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
    const {
      referenceAssetId,
      inputReferenceAmount,
      outputReferenceAmount,
      feePercent,
      feeAmount,
      targetAssetId,
      targetAddress,
    } = dto;

    const referenceAsset = await this.assetService.getAssetById(referenceAssetId);
    const targetAsset = await this.assetService.getAssetById(targetAssetId);

    if (!referenceAsset || !targetAsset) {
      throw new BadRequestException('Provided asset ID(s) not found in the database');
    }

    return Reward.create(
      staking,
      referenceAsset,
      inputReferenceAmount,
      outputReferenceAmount,
      feePercent,
      feeAmount,
      targetAsset,
      targetAddress,
    );
  }
}
