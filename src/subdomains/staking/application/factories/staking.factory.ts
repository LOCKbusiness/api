import { Injectable } from '@nestjs/common';
import { GetConfig } from 'src/config/config';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
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
    userId: number,
    depositAddress: StakingBlockchainAddress,
    withdrawalAddress: WalletBlockchainAddress,
    dto: CreateStakingDto,
  ): Promise<Staking> {
    const { assetName: name, blockchain } = dto;
    const {
      staking: { minimalStake },
    } = GetConfig();

    const asset = await this.assetService.getAssetByQuery({ name, blockchain });

    return Staking.create(userId, depositAddress, withdrawalAddress, asset, minimalStake);
  }

  createDeposit(staking: Staking, dto: CreateDepositDto): Deposit {
    const { amount, txId } = dto;

    return Deposit.create(staking, amount, txId);
  }

  createWithdrawal(staking: Staking, dto: CreateWithdrawalDto): Withdrawal {
    const { amount, signature } = dto;

    return Withdrawal.create(staking, amount, signature);
  }

  createReward(staking: Staking, dto: CreateRewardDto): Reward {
    const { amount, reinvestTxId, reinvestOutputDate, fee, amountEur, amountUsd, amountChf } = dto;

    return Reward.create(staking, amount, reinvestTxId, reinvestOutputDate, fee, amountEur, amountUsd, amountChf);
  }
}
