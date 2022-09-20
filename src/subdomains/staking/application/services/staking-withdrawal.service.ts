import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { ConfirmWithdrawalDto } from '../dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../dto/input/create-withdrawal.dto';
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

    const withdrawal = this.factory.createWithdrawal(staking, dto);

    staking.withdraw(withdrawal);

    await this.repository.save(staking);

    return staking;
  }

  async designateWithdrawalPayout(stakingId: string, withdrawalId: string): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const withdrawal = staking.getWithdrawal(withdrawalId);
    withdrawal.designateWithdrawalPayout();

    await this.repository.save(staking);

    return staking;
  }

  async confirmWithdrawal(stakingId: string, withdrawalId: string, dto: ConfirmWithdrawalDto): Promise<Staking> {
    const { outputDate, txId } = dto;
    const staking = await this.repository.findOne(stakingId);

    const withdrawal = staking.getWithdrawal(withdrawalId);
    withdrawal.confirmWithdrawal(outputDate, txId);

    await this.repository.save(staking);

    return staking;
  }

  async failWithdrawal(stakingId: string, withdrawalId: string): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const withdrawal = staking.getWithdrawal(withdrawalId);
    withdrawal.failWithdrawal();

    await this.repository.save(staking);

    return staking;
  }
}
