import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';

@Injectable()
export class StakingFactory {
  createStaking(
    userId: number,
    type: StakingType,
    depositAddress: StakingBlockchainAddress,
    withdrawalAddress: WalletBlockchainAddress,
  ): Staking {
    return Staking.create(userId, type, depositAddress, withdrawalAddress, Config.staking.minimalStake);
  }

  createDeposit(staking: Staking, dto: CreateDepositDto): Deposit {
    const { amount, txId } = dto;

    return Deposit.create(staking, amount, txId);
  }

  createWithdrawalDraft(staking: Staking, dto: CreateWithdrawalDraftDto): Withdrawal {
    const { amount } = dto;

    return Withdrawal.create(staking, amount);
  }

  createReward(staking: Staking, dto: CreateRewardDto): Reward {
    const { amount, reinvestTxId, reinvestOutputDate, fee, amountEur, amountUsd, amountChf } = dto;

    return Reward.create(staking, amount, reinvestTxId, reinvestOutputDate, fee, amountEur, amountUsd, amountChf);
  }
}
