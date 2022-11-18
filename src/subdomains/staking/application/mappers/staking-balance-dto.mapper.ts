import { Staking } from '../../domain/entities/staking.entity';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';

export class StakingBalanceDtoMapper {
  static entityToDto(staking: Staking): BalanceOutputDto {
    return {
      asset: staking.asset.name,
      balance: staking.balance,
      blockchain: staking.asset.blockchain,
    };
  }
}
