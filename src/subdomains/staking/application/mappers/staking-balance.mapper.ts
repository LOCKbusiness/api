import { StakingBalance } from '../../domain/entities/staking-balance.entity';
import { AssetBalance } from '../dto/output/asset-balance';
import { StakingBalanceDto } from '../dto/output/staking-balance.dto';

export class StakingBalanceMapper {
  static entityToDto(
    balance: StakingBalance,
    pendingDepositAmounts: AssetBalance[],
    pendingWithdrawalAmounts: AssetBalance[],
  ): StakingBalanceDto {
    return {
      asset: balance.asset.name,
      balance: balance.balance,
      pendingDeposits: pendingDepositAmounts.find((a) => a.assetId === balance.asset.id)?.balance ?? 0,
      pendingWithdrawals: pendingWithdrawalAmounts.find((a) => a.assetId === balance.asset.id)?.balance ?? 0,
    };
  }
}
