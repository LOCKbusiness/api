import { Staking } from '../../domain/entities/staking.entity';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';

export class StakingBalanceDtoMapper {
  static entityToDtos(staking: Staking): BalanceOutputDto[] {
    return staking.balances.map((b) => ({
      asset: b.asset.name,
      balance: b.balance,
      blockchain: b.asset.blockchain,
      stakingStrategy: staking.strategy,
    }));
  }
}
