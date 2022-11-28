import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingRewardBatchService } from './staking-reward-batch.service';
import { StakingRewardDexService } from './staking-reward-dex.service';
import { StakingRewardOutService } from './staking-reward-out.service';

@Injectable()
export class StakingRewardService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly batchService: StakingRewardBatchService,
    private readonly dexService: StakingRewardDexService,
    private readonly outService: StakingRewardOutService,
  ) {}

  //*** PUBLIC API ***//

  async createReward(stakingId: number, dto: CreateRewardDto): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId, { relations: ['rewards'] });
    if (!staking) throw new NotFoundException('Staking not found');

    const reward = await this.factory.createReward(staking, dto);

    staking.addReward(reward);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  async processRewards(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
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
