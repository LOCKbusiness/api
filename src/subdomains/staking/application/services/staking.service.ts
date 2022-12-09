import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { DepositStatus, WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { GetOrCreateStakingQuery } from '../dto/input/get-staking.query';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingBalanceDtoMapper } from '../mappers/staking-balance-dto.mapper';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingStrategyValidator } from '../validators/staking-strategy.validator';
import { ReservableBlockchainAddressService } from '../../../address-pool/application/services/reservable-blockchain-address.service';
import { BlockchainAddressReservationPurpose } from 'src/subdomains/address-pool/domain/enums';

@Injectable()
export class StakingService {
  constructor(
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly addressService: ReservableBlockchainAddressService,
    private readonly assetService: AssetService,
  ) {}

  //*** PUBLIC API ***//

  async getOrCreateStaking(
    userId: number,
    walletId: number,
    query: GetOrCreateStakingQuery,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const { asset: assetName, blockchain, strategy } = query;

    const assetSpec = StakingStrategyValidator.validate(strategy, assetName, blockchain);
    const asset = await this.assetService.getAssetByQuery(assetSpec);
    if (!asset) throw new NotFoundException('Asset not found');

    const existingStaking = await this.repository.findOne({ userId, asset, strategy });
    if (existingStaking)
      return StakingOutputDtoMapper.entityToDto(await this.authorize.authorize(userId, existingStaking.id));

    return StakingOutputDtoMapper.entityToDto(await this.createStaking(userId, walletId, { asset, strategy }));
  }

  async getDepositAddressBalances(address: string): Promise<BalanceOutputDto[]> {
    const stakingEntities = await this.getStakingsByDepositAddress(address);
    if (stakingEntities.length == 0) throw new NotFoundException('No staking for deposit address found');
    return stakingEntities.map(StakingBalanceDtoMapper.entityToDto);
  }

  async getUserAddressBalances(address: string): Promise<BalanceOutputDto[]> {
    const stakingEntities = await this.getStakingsByUserAddress(address);
    if (stakingEntities.length == 0) throw new NotFoundException('No staking for user address found');

    return stakingEntities.map(StakingBalanceDtoMapper.entityToDto);
  }

  async getStakingsByUserAddress(address: string): Promise<Staking[]> {
    const user = await this.userService.getUserByAddress(address);
    if (!user) throw new NotFoundException('User not found');
    return await this.repository.find({
      where: { userId: user.id },
      relations: ['rewards', 'withdrawals', 'deposits'],
    });
  }

  async getStakingsByDepositAddress(address: string): Promise<Staking[]> {
    return await this.repository.find({
      where: { depositAddress: { address: address } },
      relations: ['rewards', 'withdrawals', 'deposits'],
    });
  }

  async getStakingsByUserId(userId: number, type?: StakingType): Promise<Staking[]> {
    return this.repository.find({
      where: { userId, ...type },
      relations: ['asset', 'deposits', 'withdrawals', 'rewards'],
    });
  }

  async getAverageStakingBalance(type: StakingType, dateFrom: Date, dateTo: Date): Promise<number> {
    const currentBalance = (await this.getCurrentTotalStakingBalance(type)) ?? 0;
    const balances: number[] = [];

    for (
      const dateIterator = new Date(dateFrom);
      dateIterator < dateTo;
      dateIterator.setDate(dateIterator.getDate() + 1)
    ) {
      balances.push(await this.getPreviousTotalStakingBalance(type, currentBalance, dateIterator));
    }

    return Util.avg(balances);
  }

  async getAverageRewards({ asset, strategy }: StakingType, dateFrom: Date, dateTo: Date): Promise<number> {
    const { rewardVolume } = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.rewards', 'rewards')
      .select('SUM(amount)', 'rewardVolume')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('rewards.reinvestOutputDate BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne<{ rewardVolume: number }>();

    return rewardVolume / Util.daysDiff(dateFrom, dateTo);
  }

  async getCurrentTotalStakingBalance({ asset, strategy }: StakingType): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .select('SUM(balance)', 'balance')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
  }

  async setStakingFee(stakingId: number, { feePercent }: SetStakingFeeDto): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  async updateBalance(stakingId: number): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    staking.updateBalance();

    await this.repository.save(staking);
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_MINUTE)
  async calculateFiatReferenceAmounts(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      const stakings = await this.getStakingsWithoutFiatReferences();
      const prices = await this.getReferencePrices(stakings);
      await this.calculateFiatReferencesForStakings(stakings, prices);
    } catch (e) {
      console.error('Exception during staking deposits and withdrawals fiat reference calculation:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async createStaking(userId: number, walletId: number, type: StakingType): Promise<Staking> {
    // retry (in case of deposit address conflict)
    const depositAddress = await this.addressService.getAvailableAddress(BlockchainAddressReservationPurpose.STAKING);
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    const staking = await this.factory.createStaking(userId, type, depositAddress, withdrawalAddress);

    return this.repository.save(staking);
  }

  private async getPreviousTotalStakingBalance(type: StakingType, currentBalance: number, date: Date): Promise<number> {
    const depositsFromDate = (await this.getTotalDepositsSince(type, date)) ?? 0;
    const withdrawalsFromDate = (await this.getTotalWithdrawalsSince(type, date)) ?? 0;

    return currentBalance - depositsFromDate + withdrawalsFromDate;
  }

  private async getTotalDepositsSince({ asset, strategy }: StakingType, date: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposits')
      .select('SUM(amount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('deposits.status = :status', { status: DepositStatus.CONFIRMED })
      .andWhere('deposits.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
  }

  private async getTotalWithdrawalsSince({ asset, strategy }: StakingType, date: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.withdrawals', 'withdrawals')
      .select('SUM(amount)', 'amount')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .andWhere('withdrawals.status = :status', { status: WithdrawalStatus.CONFIRMED })
      .andWhere('withdrawals.created >= :date', { date })
      .getRawOne<{ amount: number }>()
      .then((b) => b.amount);
  }
}
