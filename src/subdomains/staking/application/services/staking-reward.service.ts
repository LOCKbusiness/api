import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingRewardService {
  constructor(
    public readonly userService: UserService,
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
  ) {}

  //*** PUBLIC API ***//

  async createReward(stakingId: number, dto: CreateRewardDto): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId);

    const reward = this.factory.createReward(staking, dto);

    staking.addReward(reward);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }
}
