import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { KycStatus } from 'src/subdomains/user/domain/enums';

import { Staking } from '../../domain/entities/staking.entity';
import { CreateDepositDto } from '../dto/create-deposit.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
  ) {}

  //*** PUBLIC API ***//

  async createDeposit(userId: number, stakingId: string, dto: CreateDepositDto): Promise<Staking> {
    await this.checkKYC(userId);

    const staking = await this.repository.findOne(stakingId);

    if (!staking) throw new NotFoundException();

    const deposit = this.factory.createDeposit(dto);

    staking.addDeposit(deposit);

    return staking;
  }

  //*** HELPER METHODS ***//
  // TODO - if got time - move to decorator - move to shared
  private async checkKYC(userId: number): Promise<void> {
    const userKycStatus = await this.userService.getKycStatus(userId);

    if (userKycStatus === KycStatus.NA) throw new Error('Cannot proceed without KYC');
  }
}
