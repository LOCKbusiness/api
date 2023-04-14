import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common/exceptions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/services/asset.service';
import { Util } from 'src/shared/util';
import { Reward } from '../../domain/entities/reward.entity';
import { StakingBalance } from '../../domain/entities/staking-balance.entity';
import { RewardStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { SetRewardsStatusDto } from '../dto/input/set-rewards-status.dto';
import { UpdateRewardDto } from '../dto/input/update-reward.dto';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { RewardRouteOutputDtoMapper } from '../mappers/reward-route-output-dto.mapper';
import { RewardRouteRepository } from '../repositories/reward-route.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingRewardBatchService } from './staking-reward-batch.service';
import { StakingRewardDexService } from './staking-reward-dex.service';
import { StakingRewardOutService } from './staking-reward-out.service';
import { StakingService } from './staking.service';
import { StakingAnalytics } from 'src/subdomains/analytics/domain/staking-analytics.entity';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { MoreThan } from 'typeorm';

@Injectable()
export class StakingRewardService {
  constructor(
    private readonly repos: RepositoryFactory,
    private readonly authorize: StakingAuthorizeService,
    private readonly factory: StakingFactory,
    private readonly stakingRepo: StakingRepository,
    private readonly rewardRepo: RewardRepository,
    private readonly batchService: StakingRewardBatchService,
    private readonly dexService: StakingRewardDexService,
    private readonly outService: StakingRewardOutService,
    private readonly assetService: AssetService,
    private readonly stakingService: StakingService,
    private readonly rewardRouteRepo: RewardRouteRepository,
  ) {}

  // --- PUBLIC API --- //

  async getRewardVolumeAt(date: Date): Promise<number> {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = Util.daysAfter(1, from);

    return this.dexService.getRewardVolumeBetween(from, to);
  }

  async createDailyRewards(): Promise<Reward[]> {
    const customRewardRouteIds = [2534, 2535, 8607, 8608, 8609, 8610];

    // all staking assets with active yield
    const analytics = await this.repos.analytics.find({ where: { apy: MoreThan(0) } });

    // load all active routes with active stakings (balance > 0)
    const activeRoutes = await this.rewardRouteRepo
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.targetAsset', 'targetAsset')
      .innerJoinAndSelect('route.strategy', 'strategy')
      .innerJoinAndSelect('strategy.stakings', 'staking')
      .innerJoinAndSelect('staking.balances', 'balance')
      .innerJoinAndSelect('balance.asset', 'asset')
      .where('route.rewardPercent > 0')
      .andWhere('balance.balance > 0')
      .andWhere('balance.assetId IN (:...assetIds)', { assetIds: analytics.map((a) => a.asset.id) })
      .orWhere('route.id IN (:...ids)', { ids: customRewardRouteIds })
      .andWhere('targetAsset.id = asset.id')
      .getMany();

    // create a reward per active route and active balance
    const rewards: Reward[] = [];

    for (const route of activeRoutes) {
      const balances = route.strategy.stakings.reduce(
        (prev, curr) => prev.concat(curr.balances),
        [] as StakingBalance[],
      );

      for (const { asset } of balances) {
        rewards.push(this.factory.createReward(route, asset));
      }
    }

    // save in one transaction
    return this.rewardRepo.saveMany(rewards, Infinity);
  }

  async setRewardsStatus({ ids, status }: SetRewardsStatusDto): Promise<void> {
    await this.rewardRepo.update(ids, { status });
  }

  async updateReward(rewardId: number, dto: UpdateRewardDto): Promise<Reward> {
    const entity = await this.rewardRepo.findOneBy({ id: rewardId });
    if (!entity) throw new NotFoundException('Reward not found');
    if (entity.status != RewardStatus.CREATED || (dto.status && dto.status != RewardStatus.READY))
      throw new BadRequestException('Reward update not allowed');

    return this.rewardRepo.save({ ...entity, ...dto });
  }

  async setRewardRoutes(userId: number, stakingId: number, dtos: CreateRewardRouteDto[]): Promise<StakingOutputDto> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    const supportedAssets = await this.assetService.getAllAssetsForBlockchain(staking.blockchain);
    const rewardRoutes = dtos.map((dto) => this.factory.createRewardRoute(dto, supportedAssets));

    const updatedStaking = await this.stakingRepo.saveWithLock(
      stakingId,
      (staking) => staking.setRewardRoutes(rewardRoutes),
      [
        'balances',
        'balances.asset',
        'rewardStrategy',
        'rewardStrategy.rewardRoutes',
        'rewardStrategy.rewardRoutes.targetAsset',
      ],
    );

    return this.stakingService.getStakingDto(updatedStaking);
  }

  async getRewardRoutes(userId: number, stakingId: number): Promise<RewardRouteOutputDto[]> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    return RewardRouteOutputDtoMapper.entityToDtos(staking);
  }

  // --- JOBS --- //

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createRewards(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_REWARD_PAYOUT)) return;

    try {
      await this.createDailyRewards();
    } catch (e) {
      console.error('Error while creating rewards', e);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  @Lock(7200)
  async prepareRewards(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_REWARD_PAYOUT)) return;

    await this.dexService.prepareDfiToken();
    await this.batchService.batchRewardsByAssets();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(7200)
  async processRewards(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_REWARD_PAYOUT)) return;

    await this.dexService.secureLiquidity();
    await this.outService.payoutRewards();
  }
}
