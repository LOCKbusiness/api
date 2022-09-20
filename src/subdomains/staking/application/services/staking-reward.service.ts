import { Injectable } from '@nestjs/common';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateRewardDto } from '../dto/create-reward.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingRewardService {
  constructor(private readonly factory: StakingFactory, private readonly repository: StakingRepository) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createReward(userId: number, stakingId: string, dto: CreateRewardDto): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const reward = this.factory.createReward(staking, dto);

    staking.addReward(reward);

    return staking;
  }
}
