import { Config } from 'src/config/config';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { RewardRouteOutputDtoMapper } from './reward-route-output-dto.mapper';

export class StakingOutputDtoMapper {
  static entityToDto(
    staking: Staking,
    pendingWithdrawalsAmount: number,
    unconfirmedDepositsAmount: number,
  ): StakingOutputDto {
    const dto = new StakingOutputDto();

    dto.id = staking.id;
    dto.status = staking.status;
    dto.asset = staking.asset.name;
    dto.depositAddress = staking.depositAddress.address;
    dto.strategy = staking.strategy;
    dto.minimalStake = Config.staking.minimalStake;
    dto.minimalDeposit = Config.payIn.min.DeFiChain[staking.asset.name];
    dto.fee = staking.fee ?? Config.staking.defaultFee;
    dto.balance = staking.balance;
    dto.pendingDeposits = unconfirmedDepositsAmount;
    dto.pendingWithdrawals = pendingWithdrawalsAmount;
    dto.rewardRoutes = staking.activeRewardRoutes.map(RewardRouteOutputDtoMapper.entityToDto);
    dto.rewardsAmount = staking.rewardsAmount;

    return dto;
  }
}
