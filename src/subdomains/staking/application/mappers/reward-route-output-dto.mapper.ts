import { Staking } from '../../domain/entities/staking.entity';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';

export class RewardRouteOutputDtoMapper {
  static entityToDtos(staking: Staking): RewardRouteOutputDto[] {
    return staking.rewardStrategy.activeCustomRewardRoutes.map((route) => ({
      id: route.id,
      label: route.label,
      rewardPercent: route.rewardPercent,
      targetAsset: route.targetAsset.name,
      targetAddress: route.targetAddress.address,
      targetBlockchain: route.targetAddress.blockchain,
    }));
  }
}
