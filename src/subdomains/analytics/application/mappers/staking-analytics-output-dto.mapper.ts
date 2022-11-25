import { StakingAnalytics } from '../../domain/staking-analytics.entity';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';

export class StakingAnalyticsOutputDtoMapper {
  static entityToDto(analytics: StakingAnalytics): StakingAnalyticsOutputDto {
    const dto = new StakingAnalyticsOutputDto();

    dto.updated = analytics.updated;
    dto.apr = analytics.apr;
    dto.apy = analytics.apy;
    dto.masternodeCount = analytics.masternodes;
    dto.tvl = analytics.tvl;

    return dto;
  }
}
