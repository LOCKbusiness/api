import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingWithdrawalService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createWithdrawal(userId: number, stakingId: string, dto: CreateWithdrawalDto): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const deposit = this.factory.createDeposit(dto);

    staking.addDeposit(deposit);

    return staking;
  }
}
