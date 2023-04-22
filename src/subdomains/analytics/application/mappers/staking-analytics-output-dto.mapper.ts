import { Util } from 'src/shared/util';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';

export class StakingAnalyticsOutputDtoMapper {
  static entityToDto(analytics: StakingAnalytics): StakingAnalyticsOutputDto {
    const dto = new StakingAnalyticsOutputDto();

    dto.updated = analytics.updated;
    dto.apr = analytics.apr;
    dto.apy = analytics.apy;
    dto.operatorCount = analytics.operatorCount;
    dto.tvl = Util.round(analytics.tvl, 8);
    dto.tvlUsd = Util.round(analytics.tvl * analytics.asset.approxPriceUsd, 8);
    dto.asset = analytics.asset.name;
    dto.strategy = analytics.strategy;

    return dto;
  }
}
