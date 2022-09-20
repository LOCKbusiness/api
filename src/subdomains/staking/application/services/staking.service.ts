import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { KycStatus } from 'src/subdomains/user/domain/enums';

import { Staking } from '../../domain/entities/staking.entity';
import { CreateStakingDto } from '../dto/create-staking.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
  ) {}

  //*** PUBLIC API ***//

  async createStaking(userId: number, dto: CreateStakingDto): Promise<Staking> {
    await this.checkKYC(userId);

    const staking = this.factory.createStaking(dto);

    await this.repository.save(staking);

    return staking;
  }

  async getBalance(userId: number, stakingId: string): Promise<number> {
    await this.checkKYC(userId);

    const staking = await this.repository.findOne(stakingId);

    if (!staking) throw new NotFoundException();

    return staking.getBalance();
  }

  //*** HELPER METHODS ***//
  // TODO - if got time - move to decorator - move to shared
  private async checkKYC(userId: number): Promise<void> {
    const userKycStatus = await this.userService.getKycStatus(userId);

    if (userKycStatus === KycStatus.NA) throw new Error('Cannot proceed without KYC');
  }
}
