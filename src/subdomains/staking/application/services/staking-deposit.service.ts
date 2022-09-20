import { Injectable } from '@nestjs/common';
import { BlockchainAddressService } from 'src/shared/models/blockchain-address/blockchain-address.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { ConfirmDepositDto } from '../dto/input/confirm-deposit.dto';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly blockchainAddressService: BlockchainAddressService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createDeposit(userId: number, stakingId: string, dto: CreateDepositDto): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const deposit = this.factory.createDeposit(staking, dto);

    staking.addDeposit(deposit);

    return staking;
  }

  @Authorize()
  @CheckKyc()
  async confirmDeposit(userId: number, stakingId: string, depositId: string, dto: ConfirmDepositDto): Promise<Staking> {
    const { txId } = dto;
    const staking = await this.repository.findOne(stakingId);

    const deposit = staking.getDeposit(depositId);

    deposit.confirmDeposit(txId);

    return staking;
  }
}
