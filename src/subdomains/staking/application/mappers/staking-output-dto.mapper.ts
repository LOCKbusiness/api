import { Config } from 'src/config/config';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingOutputDto } from '../dto/output/staking.output.dto';

export class StakingOutputDtoMapper {
  static entityToDto(staking: Staking): StakingOutputDto {
    const dto = new StakingOutputDto();

    dto.id = staking.id;
    dto.status = staking.status;
    dto.asset = staking.asset.name;
    dto.depositAddress = staking.depositAddress.address;
    dto.strategy = staking.strategy;
    dto.minimalStake = Config.staking.minimalStake;
    dto.minimalDeposit = Config.staking.minimalDeposit;
    dto.fee = staking.fee;
    dto.balance = staking.getBalance();
    dto.pendingDeposits = staking.getUnconfirmedDepositsAmount();
    dto.pendingWithdrawals = staking.getPendingWithdrawalsAmount();

    return dto;
  }
}
