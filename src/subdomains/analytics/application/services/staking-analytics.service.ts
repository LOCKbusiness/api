import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { AssetQuery, AssetService } from 'src/shared/models/asset/asset.service';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategyValidator } from 'src/subdomains/staking/application/validators/staking-strategy.validator';
import { StakingType, StakingTypes } from 'src/subdomains/staking/domain/entities/staking.entity';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';
import { StakingAnalyticsQuery } from '../dto/input/staking-analytics-query.dto';
import { StakingAnalyticsOutputDto } from '../dto/output/staking-analytics.output.dto';
import { StakingAnalyticsOutputDtoMapper } from '../mappers/staking-analytics-output-dto.mapper';
import { StakingAnalyticsRepository } from '../repositories/staking-analytics.repository';
import { PRICE_PROVIDER, PriceProvider } from 'src/subdomains/staking/application/interfaces';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { UpdateStakingAnalyticsDto } from '../dto/input/update-staking-analytics.dto';
import { Util } from 'src/shared/util';

@Injectable()
export class StakingAnalyticsService implements OnModuleInit {
  constructor(
    private readonly repos: RepositoryFactory,
    private readonly repository: StakingAnalyticsRepository,
    private readonly stakingService: StakingService,
    private readonly masternodeService: MasternodeService,
    private readonly vaultService: VaultService,
    private readonly assetService: AssetService,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  // --- PUBLIC API --- //

  async getStakingAnalyticsCache({
    strategy,
    asset,
    blockchain,
  }: StakingAnalyticsQuery): Promise<StakingAnalyticsOutputDto> {
    const assetSpec = StakingStrategyValidator.validate(strategy, asset, blockchain);

    const analytics = await this.repository.getByType({ asset: assetSpec, strategy });
    if (!analytics) throw new NotFoundException();

    return StakingAnalyticsOutputDtoMapper.entityToDto(analytics);
  }

  async update(id: number, dto: UpdateStakingAnalyticsDto): Promise<StakingAnalytics> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('StakingAnalytics entity not found');

    const apy = Util.round(Util.aprToApy(dto.apr, 365), 4);

    return this.repository.save({ ...entity, ...{ apy }, ...dto });
  }

  // --- JOBS --- //
  onModuleInit() {
    void this.updateStakingAnalytics();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStakingAnalytics(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const { dateFrom, dateTo } = StakingAnalytics.getAprPeriod();
      const stakingTypes = await this.getStakingTypes();
      const dfi = await this.assetService.getDfiCoin();

      for (const type of stakingTypes) {
        // get APR
        const averageBalance = await this.stakingService.getAverageStakingBalance(type, dateFrom, dateTo);
        let averageRewards = await this.stakingService.getAverageRewards(type, dateFrom, dateTo);

        // convert to staking asset (rewards are in DFI)
        if (type.asset.name !== dfi.name) {
          const { price } = await this.priceProvider.getAverageExchangePrice(dfi.id, type.asset.id, dateFrom, dateTo);

          averageRewards = averageRewards / price;
        }

        const analytics = (await this.repository.getByType(type)) ?? this.repository.create(type);

        // get TVL and operator count
        const tvl = await this.repos.staking.getCurrentTotalStakingBalance(type);
        const operatorCount = await this.getOperatorCount(type);

        analytics.updateAnalytics(averageBalance, averageRewards, operatorCount, tvl);
        await this.repository.save(analytics);
      }
    } catch (e) {
      console.error('Exception during staking analytics update:', e);
    }
  }

  private async getOperatorCount(type: StakingType): Promise<number | undefined> {
    if (type.asset.name === 'DFI') {
      return this.masternodeService.getActiveCount();
    } else if (type.asset.name === 'DUSD') {
      return this.vaultService.getActiveCount();
    }

    return undefined;
  }

  private async getStakingTypes(): Promise<StakingType[]> {
    const stakingTypes = Object.entries(StakingTypes) as [StakingStrategy, AssetQuery[]][];
    const types: StakingType[] = [];
    for (const [strategy, assetSpecs] of stakingTypes) {
      const assets = await this.assetService.getAssetsByQuery(assetSpecs);
      types.push(...assets.map((asset) => ({ strategy, asset })));
    }
    return types;
  }
}
