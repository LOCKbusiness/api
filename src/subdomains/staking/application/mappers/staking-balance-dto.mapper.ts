import { Staking } from '../../domain/entities/staking.entity';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';

export class StakingBalanceDtoMapper {
  static entityToDto(staking: Staking): BalanceOutputDto {
    return {
      asset: staking.balances[0].asset.name,
      balance: staking.balances[0].balance,
      balances: staking.balances,
      blockchain: staking.balances[0].asset.blockchain,
    };
  }
}
