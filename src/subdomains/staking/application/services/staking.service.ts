import { ConflictException, Injectable } from '@nestjs/common';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { DepositStatus, WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { CreateStakingDto } from '../dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingBlockchainAddressService } from './staking-blockchain-address.service';

@Injectable()
export class StakingService {
  constructor(
    public readonly repository: StakingRepository,
    public readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly addressService: StakingBlockchainAddressService,
  ) {}

  //*** PUBLIC API ***//

  async createStaking(userId: number, walletId: number, dto: CreateStakingDto): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const depositAddress = await this.addressService.getAvailableAddress();
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    // only one staking per address
    const existingStaking = await this.repository.findOne({ where: { withdrawalAddress } });
    if (existingStaking) throw new ConflictException();

    const staking = await this.factory.createStaking(userId, depositAddress, withdrawalAddress, dto);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async getStaking(userId: number, walletId: number, stakingId: number): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async setStakingFee(stakingId: number, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  async getAverageStakingBalance(dateFrom: Date, dateTo: Date): Promise<number> {
    const currentBalance = await this.getCurrentTotalStakingBalance();
    const balances: number[] = [];

    for (
      const dateIterator = new Date(dateFrom);
      dateIterator < dateTo;
      dateIterator.setDate(dateIterator.getDate() + 1)
    ) {
      balances.push(await this.getPreviousTotalStakingBalance(currentBalance, dateIterator));
    }

    return Util.avg(balances);
  }

  // assuming DFI is the only staking asset
  async getTotalRewards(dateFrom: Date, dateTo: Date): Promise<number> {
    const { rewardVolume } = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.rewards', 'rewards')
      .leftJoin('staking.asset', 'asset')
      .where('asset.name = :name', { name: 'DFI' })
      .select('SUM(amount)', 'rewardVolume')
      .where('rewards.created BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne<{ rewardVolume: number }>();

    return rewardVolume;
  }

  //*** HELPER METHODS ***//

  private async getPreviousTotalStakingBalance(currentBalance: number, date: Date): Promise<number> {
    const depositsFromDate = await this.getTotalDepositsSince(date);
    const withdrawalsFromDate = await this.getTotalWithdrawalsSince(date);

    return currentBalance - depositsFromDate + withdrawalsFromDate;
  }

  // assuming DFI is the only staking asset
  private async getCurrentTotalStakingBalance(): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.asset', 'asset')
      .where('asset.name = :name', { name: 'DFI' })
      .select('SUM(balance)', 'balance')
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
  }

  // assuming DFI is the only staking asset
  private async getTotalDepositsSince(date: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposits')
      .leftJoin('staking.asset', 'asset')
      .where('asset.name = :name', { name: 'DFI' })
      .andWhere('deposits.status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('deposits.created >= :date', { date })
      .select('SUM(amount)', 'amount')
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
  }

  // assuming DFI is the only staking asset
  private async getTotalWithdrawalsSince(date: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.withdrawals', 'withdrawals')
      .leftJoin('staking.asset', 'asset')
      .where('asset.name = :name', { name: 'DFI' })
      .andWhere('withdrawals.status = :status', { status: WithdrawalStatus.CONFIRMED })
      .andWhere('withdrawals.created >= :date', { date })
      .select('SUM(amount)', 'amount')
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
  }
}
