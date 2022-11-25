import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { MasternodeRepository } from 'src/integration/masternode/application/repositories/masternode.repository';
import { AssetQuery, AssetService } from 'src/shared/models/asset/asset.service';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategyValidator } from 'src/subdomains/staking/application/validators/staking-strategy.validator';
import { StakingType, StakingTypes } from 'src/subdomains/staking/domain/entities/staking.entity';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { getCustomRepository, IsNull, Not } from 'typeorm';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';
import { StakingAnalyticsQuery } from '../dto/input/staking-analytics-query.dto';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';
import { StakingAnalyticsOutputDtoMapper } from '../mappers/staking-analytics-output-dto.mapper';
import { StakingAnalyticsRepository } from '../repositories/staking-analytics.repository';

@Injectable()
export class StakingAnalyticsService {
  constructor(
    private readonly repository: StakingAnalyticsRepository,
    private readonly stakingService: StakingService,
    private readonly assetService: AssetService,
  ) {}

  //*** PUBLIC API ***//

  async getStakingAnalyticsCache({
    strategy,
    asset,
    blockchain,
  }: StakingAnalyticsQuery): Promise<StakingAnalyticsOutputDto> {
    const assetSpec = StakingStrategyValidator.validate(strategy, asset, blockchain);
    const type = await this.getStakingType(assetSpec, strategy);

    const analytics = await this.repository.findOne(type);
    if (!analytics) throw new NotFoundException();

    return StakingAnalyticsOutputDtoMapper.entityToDto(analytics);
  }

  //*** JOBS ***//
  async onModuleInit() {
    await this.updateStakingAnalytics();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStakingAnalytics(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const { dateFrom, dateTo } = StakingAnalytics.getAprPeriod();
      const stakingTypes = await this.getStakingTypes();

      const masternodes = await getCustomRepository(MasternodeRepository).count({
        where: { creationHash: Not(IsNull()), resignHash: IsNull() },
      });

      for (const type of stakingTypes) {
        const averageBalance = await this.stakingService.getAverageStakingBalance(type, dateFrom, dateTo);
        const averageRewards = await this.stakingService.getAverageRewards(type, dateFrom, dateTo);

        const analytics = (await this.repository.findOne(type)) ?? this.repository.create(type);

        // calculate database balance

        const tvl = await this.stakingService.getCurrentTotalStakingBalance(type);
        analytics.updateAnalytics(averageBalance, averageRewards, masternodes, tvl);

        await this.repository.save(analytics);
      }
    } catch (e) {
      console.error('Exception during staking analytics update:', e);
    }
  }

  private async getStakingTypes(): Promise<StakingType[]> {
    const stakingTypes = Object.entries(StakingTypes) as [StakingStrategy, AssetQuery[]][];
    const types: StakingType[] = [];
    for (const [strategy, assetSpecs] of stakingTypes) {
      for (const assetSpec of assetSpecs) {
        types.push(await this.getStakingType(assetSpec, strategy));
      }
    }
    return types;
  }

  private async getStakingType(assetSpec: AssetQuery, strategy: StakingStrategy): Promise<StakingType> {
    return { asset: await this.assetService.getAssetByQuery(assetSpec), strategy };
  }
}
