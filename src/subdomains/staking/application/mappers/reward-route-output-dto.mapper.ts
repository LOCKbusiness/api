import { RewardRoute } from '../../domain/entities/reward-route.entity';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';

export class RewardRouteOutputDtoMapper {
  static entityToDto(route: RewardRoute): RewardRouteOutputDto {
    const dto = new RewardRouteOutputDto();

    dto.id = route.id;
    dto.stakingId = route.staking?.id;
    dto.label = route.label;
    dto.rewardPercent = route.rewardPercent;
    dto.targetAsset = route.targetAsset.name;
    dto.targetAddress = route.targetAddress.address;
    dto.targetBlockchain = route.targetAddress.blockchain;

    return dto;
  }
}
