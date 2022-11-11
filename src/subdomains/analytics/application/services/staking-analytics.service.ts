import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { AssetType } from 'src/shared/models/asset/asset.entity';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';
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

  async getStakingAnalyticsCache(): Promise<StakingAnalyticsOutputDto> {
    const analytics = await this.repository.findOne();

    if (!analytics) throw new NotFoundException();

    return StakingAnalyticsOutputDtoMapper.entityToDto(analytics);
  }

  //*** JOBS ***//
  onModuleInit() {
    this.updateStakingAnalytics();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStakingAnalytics(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const { dateFrom, dateTo } = StakingAnalytics.getAprPeriod();

      const asset = await this.assetService.getAssetByQuery({
        name: 'DFI',
        blockchain: Blockchain.DEFICHAIN,
        type: AssetType.COIN,
      });
      const strategy = StakingStrategy.MASTERNODE;

      const averageBalance = await this.stakingService.getAverageStakingBalance({ asset, strategy }, dateFrom, dateTo);
      const averageRewards = await this.stakingService.getAverageRewards({ asset, strategy }, dateFrom, dateTo);

      const analytics = (await this.repository.findOne()) ?? this.repository.create();

      analytics.updateAnalytics(averageBalance, averageRewards);

      await this.repository.save(analytics);
    } catch (e) {
      console.error('Exception during staking analytics update:', e);
    }
  }
}
