import { Injectable } from '@nestjs/common';
import { BlockchainAddressService } from 'src/shared/models/blockchain-address/blockchain-address.service';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateStakingDto } from '../dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { StakingBalanceDto } from '../dto/output/staking-balance.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly blockchainAddressService: BlockchainAddressService,
    private readonly userService: UserService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createStaking(userId: number, dto: CreateStakingDto): Promise<Staking> {
    const depositAddress = await this.blockchainAddressService.getAvailableAddressFromPool();
    const withdrawalAddress = await this.userService.getWalletAddress(userId);

    const staking = await this.factory.createStaking(dto, depositAddress, withdrawalAddress);

    await this.repository.save(staking);

    return staking;
  }

  @Authorize()
  @CheckKyc()
  async getBalance(userId: number, stakingId: string): Promise<StakingBalanceDto> {
    const staking = await this.repository.findOne(stakingId);

    return {
      balance: staking.getBalance(),
      pendingDeposits: staking.getPendingDepositsAmount(),
      pendingWithdrawals: staking.getPendingWithdrawalsAmount(),
    };
  }

  @Authorize()
  @CheckKyc()
  async getDepositAddress(userId: number, stakingId: string): Promise<string> {
    const staking = await this.repository.findOne(stakingId);

    return staking.depositAddress.address;
  }

  @Authorize()
  @CheckKyc()
  async getMinimumStake(userId: number, stakingId: string): Promise<number> {
    const staking = await this.repository.findOne(stakingId);

    return staking.minimalStake;
  }

  @Authorize()
  @CheckKyc()
  async getMinimumDeposit(userId: number, stakingId: string): Promise<number> {
    const staking = await this.repository.findOne(stakingId);

    return staking.minimalDeposit;
  }

  @Authorize()
  @CheckKyc()
  async getStakingFee(userId: number, stakingId: string): Promise<number> {
    const staking = await this.repository.findOne(stakingId);

    return staking.stakingFee;
  }

  async setStakingFee(userId: number, stakingId: string, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }
}
