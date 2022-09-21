import { Staking } from '../../domain/entities/staking.entity';
import { StakingOutputDto } from '../dto/output/staking.output.dto';

export class StakingOutputDtoMapper {
  static entityToDto(staking: Staking): StakingOutputDto {
    const dto = new StakingOutputDto();

    dto.depositAddress = staking.depositAddress.address;
    dto.minimalStake = staking.minimalStake;
    dto.minimalDeposit = staking.minimalDeposit;
    dto.stakingFee = staking.stakingFee;
    dto.balance = staking.getBalance();
    dto.pendingDeposits = staking.getPendingDepositsAmount();
    dto.pendingWithdrawals = staking.getPendingWithdrawalsAmount();

    return dto;
  }
}
