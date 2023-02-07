import { Staking } from '../../domain/entities/staking.entity';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';

export class RewardRouteOutputDtoMapper {
  static entityToDtos(staking: Staking): RewardRouteOutputDto[] {
    return staking.activeRewardRoutes.map((route) => ({
      id: route.id,
      stakingId: staking.id,
      label: route.label,
      rewardPercent: route.rewardPercent,
      targetAsset: route.targetAsset.name,
      targetAddress: route.targetAddress.address,
      targetBlockchain: route.targetAddress.blockchain,
      isReinvest: route.targetAddress.isEqual(staking.depositAddress),
    }));
  }
}
