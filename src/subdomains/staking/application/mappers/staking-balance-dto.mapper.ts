import { StakingBalance } from '../../domain/entities/staking-balance.entity';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';

export class StakingBalanceDtoMapper {
  static entityToDto(stakingBalance: StakingBalance): BalanceOutputDto {
    return {
      asset: stakingBalance.asset.name,
      balance: stakingBalance.balance,
      blockchain: stakingBalance.asset.blockchain,
      strategy: stakingBalance.staking.strategy,
    };
  }
}
