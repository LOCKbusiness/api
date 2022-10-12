import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Price } from 'src/shared/models/price';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { DepositStatus, WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { GetOrCreateStakingQuery } from '../dto/input/get-staking.query';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { PriceProvider } from '../interfaces';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingBlockchainAddressService } from './staking-blockchain-address.service';

@Injectable()
export class StakingService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly addressService: StakingBlockchainAddressService,
    private readonly assetService: AssetService,
    private readonly priceProvider: PriceProvider,
  ) {}

  //*** PUBLIC API ***//

  async getOrCreateStaking(
    userId: number,
    walletId: number,
    query: GetOrCreateStakingQuery,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const { assetName, blockchain } = query;

    const asset = await this.assetService.getAssetByQuery({ name: assetName, blockchain });
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    if (!asset || !withdrawalAddress) throw new NotFoundException();

    const existingStaking = await this.repository.findOne({ userId, asset, withdrawalAddress });

    if (!existingStaking) {
      return StakingOutputDtoMapper.entityToDto(await this.createStaking(userId, walletId, query));
    }

    return StakingOutputDtoMapper.entityToDto(await this.authorize.authorize(userId, existingStaking.id));
  }

  async setStakingFee(stakingId: number, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  async getAverageStakingBalance(dateFrom: Date, dateTo: Date): Promise<number> {
    const currentBalance = (await this.getCurrentTotalStakingBalance()) ?? 0;
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

  //*** JOBS ***//

  @Interval(60000)
  async calculateFiatReferenceAmounts(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      const prices = await this.getReferencePrices();
      await this.calculateFiatForDeposits(prices);
      await this.calculateFiatForWithdrawals(prices);
    } catch (e) {
      console.error('Exception during staking deposits and withdrawals fiat reference calculation:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async createStaking(userId: number, walletId: number, dto: GetOrCreateStakingQuery): Promise<Staking> {
    const depositAddress = await this.addressService.getAvailableAddress();
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    // only one staking per address
    const existingStaking = await this.repository.findOne({ where: { withdrawalAddress } });
    if (existingStaking) throw new ConflictException();

    const staking = await this.factory.createStaking(userId, depositAddress, withdrawalAddress, dto);

    return this.repository.save(staking);
  }

  private async getPreviousTotalStakingBalance(currentBalance: number, date: Date): Promise<number> {
    const depositsFromDate = (await this.getTotalDepositsSince(date)) ?? 0;
    const withdrawalsFromDate = (await this.getTotalWithdrawalsSince(date)) ?? 0;

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

  private async getReferencePrices(): Promise<Price[]> {
    const prices = [];

    for (const fiat of Object.values(Fiat)) {
      const price = await this.priceProvider.getPriceForFiat(fiat);

      prices.push(price);
    }

    return prices;
  }

  private async calculateFiatForDeposits(prices: Price[]): Promise<void> {
    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakingIds = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposit')
      .where('deposit.amountEur IS NULL OR deposit.amountUsd IS NULL OR deposit.amountChf IS NULL')
      .getMany()
      .then((s) => s.map((i) => i.id));

    for (const stakingId of stakingIds) {
      await this.calculateFiatForDepositsInStaking(stakingId, prices);
    }
  }

  private async calculateFiatForWithdrawals(prices: Price[]): Promise<void> {
    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakingIds = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.withdrawals', 'withdrawal')
      .where('withdrawal.amountEur IS NULL OR withdrawal.amountUsd IS NULL OR withdrawal.amountChf IS NULL')
      .getMany()
      .then((s) => s.map((i) => i.id));

    for (const stakingId of stakingIds) {
      await this.calculateFiatForWithdrawalsInStaking(stakingId, prices);
    }
  }

  private async calculateFiatForDepositsInStaking(stakingId: number, prices: Price[]): Promise<void> {
    try {
      const staking = await this.repository.findOne(stakingId);

      staking.calculateFiatReferencesForDeposits(prices);
      await this.repository.save(staking);
    } catch (e) {
      console.error(`Error calculating fiat reference amounts for deposits in staking ID: ${stakingId}`, e);
    }
  }

  private async calculateFiatForWithdrawalsInStaking(stakingId: number, prices: Price[]): Promise<void> {
    try {
      const staking = await this.repository.findOne(stakingId);

      staking.calculateFiatReferencesForWithdrawals(prices);
      await this.repository.save(staking);
    } catch (e) {
      console.error(`Error calculating fiat reference amounts for deposits in staking ID: ${stakingId}`, e);
    }
  }
}
