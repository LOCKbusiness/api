import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { SettingService } from 'src/shared/services/setting.service';
import { RewardStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { CreateRewardRouteDto } from '../dto/input/create-reward-route.dto';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { RewardRouteOutputDto } from '../dto/output/reward-route.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { RewardRouteOutputDtoMapper } from '../mappers/reward-route-output-dto.mapper';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
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
    private readonly settingService: SettingService,
    private readonly assetService: AssetService,
    private readonly stakingService: StakingService,
  ) {}

  //*** PUBLIC API ***//

  async createReward(stakingId: number, dto: CreateRewardDto): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
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

  async setRewardRoutes(userId: number, stakingId: number, dtos: CreateRewardRouteDto[]): Promise<StakingOutputDto> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    const supportedAssets = await this.assetService.getAllAssets();
    const rewardRoutes = dtos.map((dto) => this.factory.createRewardRoute(staking, dto, supportedAssets));

    const updatedStaking = await this.repository.saveWithLock(
      stakingId,
      (staking) => staking.setRewardRoutes(rewardRoutes),
      ['asset', 'rewardRoutes', 'rewardRoutes.targetAsset'],
    );

    const amounts = await this.stakingService.getUnconfirmedDepositsAndWithdrawalsAmounts(stakingId);

    return StakingOutputDtoMapper.entityToDto(updatedStaking, amounts.withdrawals, amounts.deposits);
  }

  async getRewardRoutes(userId: number, stakingId: number): Promise<RewardRouteOutputDto[]> {
    const staking = await this.authorize.authorize(userId, stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    return staking.activeRewardRoutes.map(RewardRouteOutputDtoMapper.entityToDto);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  async processRewards(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_REWARD_PAYOUT)) return;
    if ((await this.settingService.get('reward-payout')) !== 'on') return;
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
