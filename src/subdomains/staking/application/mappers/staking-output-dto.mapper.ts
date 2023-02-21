import { Config } from 'src/config/config';
import { Asset } from 'src/shared/models/asset/asset.entity';
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
    asset?: Asset,
  ): StakingOutputDto {
    const balance = staking.getBalanceFor(asset) ?? staking.defaultBalance;

    return {
      id: staking.id,
      status: staking.status,
      asset: balance.asset.name,
      depositAddress: staking.depositAddress.address,
      strategy: staking.strategy,
      minimalStake: 1, // TODO: remove
      minimalDeposits: Config.staking.minDeposits,
      fee: staking.fee ?? Config.staking.defaultFee,
      balance: balance.balance,
      pendingDeposits: pendingDepositAmounts.find((a) => a.assetId === balance.asset.id)?.balance ?? 0,
      pendingWithdrawals: pendingWithdrawalAmounts.find((a) => a.assetId === balance.asset.id)?.balance ?? 0,
      balances: staking.balances.map((b) =>
        StakingBalanceMapper.entityToDto(b, pendingDepositAmounts, pendingWithdrawalAmounts),
      ),
      rewardRoutes: RewardRouteOutputDtoMapper.entityToDtos(staking),
    };
  }
}
