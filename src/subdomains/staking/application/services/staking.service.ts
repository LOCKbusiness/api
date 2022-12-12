import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Fiat } from 'src/shared/enums/fiat.enum';
import { Lock } from 'src/shared/lock';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Price } from 'src/shared/models/price';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Brackets } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { DepositStatus, WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { GetOrCreateStakingQuery } from '../dto/input/get-staking.query';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { FiatPriceProvider, FIAT_PRICE_PROVIDER } from '../interfaces';
import { StakingBalanceDtoMapper } from '../mappers/staking-balance-dto.mapper';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingStrategyValidator } from '../validators/staking-strategy.validator';
import { StakingBlockchainAddressService } from './staking-blockchain-address.service';

interface StakingReference {
  stakingId: number;
  assetId: number;
}

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
    @Inject(FIAT_PRICE_PROVIDER) private readonly fiatPriceProvider: FiatPriceProvider,
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
      relations: ['depositAddress', 'rewards', 'withdrawals', 'deposits'],
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateBalances(): Promise<void> {
    try {
      const stakingIds = await this.repository
        .createQueryBuilder('staking')
        .select('staking.id', 'id')
        .where('staking.stageOneBalance != staking.balance')
        .orWhere('staking.stageTwoBalance != staking.balance')
        .getRawMany<{ id: number }>();

      for (const { id } of stakingIds) {
        try {
          await this.updateBalance(id);
        } catch (e) {
          console.error(`Failed to update balance of staking ${id}:`, e);
        }
      }
    } catch (e) {
      console.error('Exception during balance update:', e);
    }
  }

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
    return Util.retry(async () => {
      const depositAddress = await this.addressService.getAvailableAddress();
      const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

      const staking = this.factory.createStaking(userId, type, depositAddress, withdrawalAddress);

      return this.repository.save(staking);
    }, 2);
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

  private async getStakingsWithoutFiatReferences(): Promise<StakingReference[]> {
    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakings = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposit')
      .leftJoin('staking.withdrawals', 'withdrawal')
      .where(
        new Brackets((qb) => {
          qb.where('deposit.status = :depositStatus', { depositStatus: DepositStatus.CONFIRMED }).andWhere(
            new Brackets((qb) => {
              qb.where('deposit.amountEur IS NULL')
                .orWhere('deposit.amountUsd IS NULL')
                .orWhere('deposit.amountChf IS NULL');
            }),
          );
        }),
      )
      .orWhere(
        new Brackets((qb) => {
          qb.where('withdrawal.status = :withdrawalStatus', { withdrawalStatus: WithdrawalStatus.CONFIRMED }).andWhere(
            new Brackets((qb) => {
              qb.where('withdrawal.amountEur IS NULL')
                .orWhere('withdrawal.amountUsd IS NULL')
                .orWhere('withdrawal.amountChf IS NULL');
            }),
          );
        }),
      )
      .leftJoinAndSelect('staking.asset', 'asset')
      .getMany()
      .then((s) => s.map((i) => ({ stakingId: i.id, assetId: i.asset.id })));

    const stakingReferences = this.removeStakingReferencesDuplicates(stakings);

    stakingReferences.length > 0 &&
      console.info(
        `Adding fiat references to ${stakingReferences.length} staking(s). Staking Id(s):`,
        stakingReferences.map((s) => s.stakingId),
      );

    return stakingReferences;
  }

  private async getReferencePrices(stakings: StakingReference[]): Promise<Price[]> {
    const prices = [];
    const uniqueAssetIds = [...new Set(stakings.map((s) => s.assetId))];

    for (const assetId of uniqueAssetIds) {
      for (const fiatName of Object.values(Fiat)) {
        try {
          const price = await this.fiatPriceProvider.getFiatPrice(fiatName, assetId);

          prices.push(price);
        } catch (e) {
          console.error(`Could not find fiat price for assetId ${assetId} and fiat '${fiatName}'`, e);
          continue;
        }
      }
    }

    return prices;
  }

  private async calculateFiatReferencesForStakings(stakings: StakingReference[], prices: Price[]): Promise<void> {
    const confirmedStakings = [];

    for (const ref of stakings) {
      try {
        await this.calculateFiatReferencesForStaking(ref.stakingId, prices);
        confirmedStakings.push(ref.stakingId);
      } catch (e) {
        console.error(
          `Could not calculate fiat reference amount for Staking Id: ${ref.stakingId}. Asset Id: ${ref.assetId}`,
          e,
        );
        continue;
      }
    }

    confirmedStakings.length > 0 &&
      console.info(
        `Successfully added fiat references to ${confirmedStakings.length} staking(s). Staking Id(s):`,
        confirmedStakings,
      );
  }

  private async calculateFiatReferencesForStaking(stakingId: number, prices: Price[]): Promise<void> {
    const staking = await this.repository.findOne(stakingId);

    staking.calculateFiatReferences(prices);
    await this.repository.save(staking);
  }

  private removeStakingReferencesDuplicates(stakings: StakingReference[] = []): StakingReference[] {
    return stakings.filter((item, pos, self) => self.findIndex((i) => i.stakingId === item.stakingId) === pos);
  }
}
