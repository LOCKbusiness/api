import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingRewardService {
  constructor(
    public readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
  ) {}

  //*** PUBLIC API ***//

  async createReward(userId: number, stakingId: string, dto: CreateRewardDto): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId);

    const staking = await this.repository.findOne(stakingId);

    const reward = this.factory.createReward(staking, dto);

    staking.addReward(reward);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }
}
