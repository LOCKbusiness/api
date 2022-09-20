import { Injectable } from '@nestjs/common';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateDepositDto } from '../dto/create-deposit.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  constructor(private readonly factory: StakingFactory, private readonly repository: StakingRepository) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createDeposit(userId: number, stakingId: string, dto: CreateDepositDto): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const deposit = this.factory.createDeposit(dto);

    staking.addDeposit(deposit);

    return staking;
  }
}
