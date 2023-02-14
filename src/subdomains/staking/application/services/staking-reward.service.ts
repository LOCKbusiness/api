import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common/exceptions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Reward } from '../../domain/entities/reward.entity';
import { RewardAssets } from '../../domain/entities/staking.entity';
import { RewardStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { UpdateRewardDto } from '../dto/input/update-reward.dto';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { RewardRouteOutputDtoMapper } from '../mappers/reward-route-output-dto.mapper';
import { RewardRepository } from '../repositories/reward.repository';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingRewardBatchService } from './staking-reward-batch.service';
import { StakingRewardDexService } from './staking-reward-dex.service';
import { StakingRewardOutService } from './staking-reward-out.service';
import { StakingService } from './staking.service';

@Injectable()
export class StakingRewardService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly authorize: StakingAuthorizeService,
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly batchService: StakingRewardBatchService,
    private readonly dexService: StakingRewardDexService,
    private readonly outService: StakingRewardOutService,
    private readonly assetService: AssetService,
    private readonly stakingService: StakingService,
  ) {}

  //*** PUBLIC API ***//

  async createReward(stakingId: number, dto: CreateRewardDto): Promise<void> {
    const staking = await this.repository.findOneBy({ id: stakingId });
    if (!staking) throw new NotFoundException('Staking not found');

    const reward = await this.factory.createReward(staking, dto);

    await this.rewardRepository.save(reward);

    if (reward.status === RewardStatus.CONFIRMED) {
      /**
       * @note
       * potential case of updateRewardsAmount failure is tolerated
       */
      await this.stakingService.updateRewardsAmount(stakingId);
    }
  }

  async updateReward(rewardId: number, dto: UpdateRewardDto): Promise<Reward> {
    const entity = await this.rewardRepository.findOneBy({ id: rewardId });
    if (!entity) throw new NotFoundException('Reward not found');
    if (entity.status != RewardStatus.CREATED || dto.status != RewardStatus.READY)
      throw new BadRequestException('Reward update not allowed');

    return this.rewardRepository.save({ ...entity, ...dto });
  }

  async setRewardRoutes(userId: number, stakingId: number, dtos: CreateRewardRouteDto[]): Promise<StakingOutputDto> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    const supportedAssets = await this.assetService.getAllAssetsForBlockchain(staking.blockchain);
    const supportedRewardAssets = await this.assetService.getAssetsByQuery(RewardAssets[staking.strategy]);
    const rewardRoutes = dtos.map((dto) =>
      this.factory.createRewardRoute(staking, dto, supportedAssets, supportedRewardAssets),
    );

    const updatedStaking = await this.repository.saveWithLock(
      stakingId,
      (staking) => staking.setRewardRoutes(rewardRoutes),
      ['balances', 'balances.asset', 'rewardRoutes', 'rewardRoutes.targetAsset', 'rewardRoutes.rewardAsset'],
    );

    return this.stakingService.getStakingDto(updatedStaking);
  }

  async getRewardRoutes(userId: number, stakingId: number): Promise<RewardRouteOutputDto[]> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    return RewardRouteOutputDtoMapper.entityToDtos(staking);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  async processRewards(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_REWARD_PAYOUT)) return;
    if (!this.lock.acquire()) return;

    try {
      await this.dexService.prepareDfiToken();
      await this.batchService.batchRewardsByAssets();
      await this.dexService.secureLiquidity();
      await this.outService.payoutRewards();
    } catch (e) {
      console.error('Error while processing rewards', e);
    } finally {
      this.lock.release();
    }
  }
}
