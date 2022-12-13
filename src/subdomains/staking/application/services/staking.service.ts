import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
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
import { Cron, CronExpression } from '@nestjs/schedule';
import { RewardRepository } from '../repositories/reward.repository';
import { DepositRepository } from '../repositories/deposit.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';

@Injectable()
export class StakingService {
  constructor(
    private readonly repository: StakingRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly depositRepository: DepositRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
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
    if (existingStaking) {
      const staking = await this.authorize.authorize(userId, existingStaking.id);

      const amounts = await this.repository.getUnconfirmedDepositsAndWithdrawalsAmounts(staking.id);

      return StakingOutputDtoMapper.entityToDto(staking, amounts.withdrawals, amounts.deposits);
    }

    return StakingOutputDtoMapper.entityToDto(await this.createStaking(userId, walletId, { asset, strategy }), 0, 0);
  }

  async getDepositAddressBalances(address: string): Promise<BalanceOutputDto[]> {
    const stakingEntities = await this.repository.getByDepositAddress(address);
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
    return await this.repository.getByUserId(user.id);
  }

  async getAverageStakingBalance(type: StakingType, dateFrom: Date, dateTo: Date): Promise<number> {
    const currentBalance = (await this.repository.getCurrentTotalStakingBalance(type)) ?? 0;
    const balances: number[] = [];

    for (
      const dateIterator = new Date(dateFrom);
      dateIterator < dateTo;
      dateIterator.setDate(dateIterator.getDate() + 1)
    ) {
      balances.push(await this.getPreviousTotalBalance(type, currentBalance, dateIterator));
    }

    return Util.avg(balances);
  }

  async getAverageRewards({ asset, strategy }: StakingType, dateFrom: Date, dateTo: Date): Promise<number> {
    const rewardVolume = await this.rewardRepository.getAllRewardsAmountForCondition(asset, strategy, dateFrom, dateTo);

    return rewardVolume / Util.daysDiff(dateFrom, dateTo);
  }

  async setStakingFee(stakingId: number, { feePercent }: SetStakingFeeDto): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    if (!staking) throw new NotFoundException('Staking not found');

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  async updateStakingBalanceConcurrently(stakingId: number): Promise<Staking> {
    const updateStakingBalance = async () => {
      /**
       * @warning
       * staking re-fetching needs to be included into update in order to get newer version on retry
       * and decrease a chance of concurrency issues
       */
      const staking = await this.repository.findOne(stakingId);
      if (!staking) throw new NotFoundException('Staking not found');

      staking.updateBalance(await this.repository.getBalances(staking.id));

      return staking;
    };

    return this.repository.updateConcurrently(updateStakingBalance);
  }

  async updateRewardsAmountConcurrently(stakingId: number): Promise<Staking> {
    function timeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    const updateRewardsAmount = async () => {
      console.log('Update try');
      /**
       * @warning
       * staking re-fetching needs to be included into update in order to get newer version on retry
       * and decrease a chance of concurrency issues
       */
      const staking = await this.repository.findOne(stakingId);
      if (!staking) throw new NotFoundException('Staking not found');
      console.log('before timeout');
      await timeout(15000);
      console.log('after timeout');

      staking.updateRewardsAmount(await this.rewardRepository.getRewardsAmount(staking.id));

      return staking;
    };

    return this.repository.updateConcurrently(updateRewardsAmount);
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
          await this.updateStakingBalanceConcurrently(id);
        } catch (e) {
          console.error(`Failed to update balance of staking ${id}:`, e);
        }
      }
    } catch (e) {
      console.error('Exception during balance update:', e);
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

  private async getPreviousTotalBalance(type: StakingType, currentBalance: number, date: Date): Promise<number> {
    const depositsFromDate = (await this.getTotalDepositsSince(type, date)) ?? 0;
    const withdrawalsFromDate = (await this.getTotalWithdrawalsSince(type, date)) ?? 0;

    return currentBalance - depositsFromDate + withdrawalsFromDate;
  }

  private async getTotalDepositsSince({ asset, strategy }: StakingType, date: Date): Promise<number> {
    return this.depositRepository.getTotalConfirmedAmountSince(asset, strategy, date);
  }

  private async getTotalWithdrawalsSince({ asset, strategy }: StakingType, date: Date): Promise<number> {
    return this.withdrawalRepository.getTotalConfirmedAmountSince(asset, strategy, date);
  }
}
