import { Injectable, NotFoundException } from '@nestjs/common';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateStakingDto } from '../dto/create-staking.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingService {
  constructor(private readonly factory: StakingFactory, private readonly repository: StakingRepository) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createStaking(userId: number, dto: CreateStakingDto): Promise<Staking> {
    const staking = this.factory.createStaking(dto);

    await this.repository.save(staking);

    return staking;
  }

  @Authorize()
  @CheckKyc()
  async getBalance(userId: number, stakingId: string): Promise<number> {
    const staking = await this.repository.findOne(stakingId);

    if (!staking) throw new NotFoundException();

    return staking.getBalance();
  }
}
