import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { CreateStakingDto } from '../dto/input/create-staking.dto';
import { CreateWithdrawalDto } from '../dto/input/create-withdrawal.dto';

@Injectable()
export class StakingFactory {
  constructor(private readonly assetService: AssetService) {}

  async createStaking(
    dto: CreateStakingDto,
    depositAddress: BlockchainAddress,
    withdrawalAddress: BlockchainAddress,
  ): Promise<Staking> {
    const { assetDexName: dexName, blockchain } = dto;
    const {
      staking: { minimalStake, minimalDeposit, stakingFee },
    } = GetConfig();

    const asset = await this.assetService.getAssetByQuery({ dexName, blockchain });

    return Staking.create(asset, depositAddress, withdrawalAddress, minimalStake, minimalDeposit, stakingFee);
  }

  createDeposit(staking: Staking, dto: CreateDepositDto): Deposit {
    const { amount, txId } = dto;

    return Deposit.create(staking, amount, txId);
  }

  createWithdrawal(dto: CreateWithdrawalDto): Withdrawal {
    return new Withdrawal();
  }

  createReward(staking: Staking, dto: CreateRewardDto): Reward {
    return Reward.create(staking, dto.amount);
  }
}
