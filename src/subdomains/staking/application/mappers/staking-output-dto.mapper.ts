import { Config } from 'src/config/config';
import { Staking } from '../../domain/entities/staking.entity';
import { AssetBalance } from '../dto/output/asset-balance';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { RewardRouteOutputDtoMapper } from './reward-route-output-dto.mapper';
import { StakingBalanceMapper } from './staking-balance.mapper';

export class StakingOutputDtoMapper {
  static entityToDto(
    staking: Staking,
    pendingDepositAmounts: AssetBalance[],
    pendingWithdrawalAmounts: AssetBalance[],
  ): StakingOutputDto {
    return {
      id: staking.id,
      status: staking.status,
      asset: staking.defaultBalance.asset.name,
      depositAddress: staking.depositAddress.address,
      strategy: staking.strategy,
      minimalStake: Config.staking.minimalStake,
      minimalDeposits: Config.payIn.min.DeFiChain,
      fee: staking.fee ?? Config.staking.defaultFee,
      balance: staking.defaultBalance.balance,
      pendingDeposits: pendingDepositAmounts.find((a) => a.assetId === staking.defaultBalance.asset.id)?.balance ?? 0,
      pendingWithdrawals:
        pendingWithdrawalAmounts.find((a) => a.assetId === staking.defaultBalance.asset.id)?.balance ?? 0,
      balances: staking.balances.map((b) =>
        StakingBalanceMapper.entityToDto(b, pendingDepositAmounts, pendingWithdrawalAmounts),
      ),
      rewardRoutes: staking.activeRewardRoutes.map(RewardRouteOutputDtoMapper.entityToDto),
    };
  }
}
