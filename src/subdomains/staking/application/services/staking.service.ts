import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from 'src/shared/services/asset.service';
import { Util } from 'src/shared/util';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { GetOrCreateStakingQuery } from '../dto/input/get-staking.query';
import { BalanceOutputDto } from '../dto/output/balance.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingBalanceDtoMapper } from '../mappers/staking-balance-dto.mapper';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { ReservableBlockchainAddressService } from '../../../address-pool/application/services/reservable-blockchain-address.service';
import { BlockchainAddressReservationPurpose } from 'src/subdomains/address-pool/domain/enums';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepositRepository } from '../repositories/deposit.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { EntityManager } from 'typeorm';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { AssetBalance } from '../dto/output/asset-balance';
import { Deposit } from '../../domain/entities/deposit.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { StakingStrategy } from '../../domain/enums';
import { Asset } from 'src/shared/entities/asset.entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { RewardStrategy } from '../../domain/entities/reward-strategy.entity';
import { RewardStrategyRepository } from '../repositories/reward-strategy.repository';
import { Config, Process } from 'src/config/config';

export interface StakingBalances {
  currentBalance: number;
  stageOneBalance: number;
  stageTwoBalance: number;
}
@Injectable()
export class StakingService {
  constructor(
    private readonly repository: StakingRepository,
    private readonly depositRepository: DepositRepository,
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly userService: UserService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly addressService: ReservableBlockchainAddressService,
    private readonly assetService: AssetService,
    private readonly rewardStrategyRepository: RewardStrategyRepository,
  ) {}

  //*** PUBLIC API ***//

  async getOrCreateStaking(
    userId: number,
    walletId: number,
    query: GetOrCreateStakingQuery,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const { blockchain, strategy } = query;

    const existingStaking = await this.repository.findOneBy({ userId, strategy });
    if (existingStaking) return this.getStakingDto(existingStaking);

    // create a new staking
    const newStaking = await this.createStaking(userId, walletId, strategy, blockchain);
    return StakingOutputDtoMapper.entityToDto(newStaking, [], []);
  }

  async getStakingDto(staking: Staking, asset?: Asset): Promise<StakingOutputDto> {
    const { deposits, withdrawals } = await this.getUnconfirmedDepositsAndWithdrawalsAmounts(staking.id);
    return StakingOutputDtoMapper.entityToDto(staking, deposits, withdrawals, asset);
  }

  async getDepositAddressBalances(address: string): Promise<BalanceOutputDto[]> {
    const stakingEntity = await this.repository.getByDepositAddress(address);
    if (!stakingEntity) throw new NotFoundException('No staking for deposit address found');

    return this.getBalanceDtos([stakingEntity]);
  }

  async getUserAddressBalances(address: string): Promise<BalanceOutputDto[]> {
    const stakingEntities = await this.getStakingsByUserAddress(address);
    if (stakingEntities.length == 0) throw new NotFoundException('No staking for user address found');

    return this.getBalanceDtos(stakingEntities);
  }

  private getBalanceDtos(stakings: Staking[]): BalanceOutputDto[] {
    return stakings.map(StakingBalanceDtoMapper.entityToDtos).reduce((prev, curr) => prev.concat(curr), []);
  }

  async getStakingsByUserAddress(address: string): Promise<Staking[]> {
    const user = await this.userService.getUserByAddressOrThrow(address);

    return this.repository.getByUserId(user.id);
  }

  async getStakingsByUserId(userId: number): Promise<Staking[]> {
    return this.repository.getByUserId(userId);
  }

  async getUnconfirmedDepositsAndWithdrawalsAmounts(
    stakingId: number,
  ): Promise<{ deposits: AssetBalance[]; withdrawals: AssetBalance[] }> {
    const deposits = await this.depositRepository.getInProgress(stakingId);
    const withdrawals = await this.withdrawalRepository.getInProgress(stakingId);

    return { deposits: this.aggregateByAsset(deposits), withdrawals: this.aggregateByAsset(withdrawals) };
  }

  async setStakingFee(stakingId: number, { feePercent }: SetStakingFeeDto): Promise<void> {
    await this.repository.saveWithLock(stakingId, (staking) => staking.setStakingFee(feePercent));
  }

  async updateStakingBalanceFor(stakingId: number, assetId: number): Promise<Staking> {
    const asset = await this.assetService.getAssetById(assetId);
    return this.updateStakingBalance(stakingId, asset);
  }

  async updateStakingBalance(stakingId: number, asset: Asset): Promise<Staking> {
    return this.repository.saveWithLock(
      stakingId,
      async (staking, manager) => staking.updateBalance(await this.getBalances(manager, staking.id, asset.id), asset),
      ['balances', 'balances.asset'],
    );
  }

  //*** JOBS ***//

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateBalances(): Promise<void> {
    try {
      if (Config.processDisabled(Process.STAKING_UPDATE_BALANCES)) return;
      const stakingIds = await this.repository
        .createQueryBuilder('staking')
        .innerJoin('staking.balances', 'balance')
        .select('staking.id', 'id')
        .where('balance.stageOneBalance != balance.balance')
        .orWhere('balance.stageTwoBalance != balance.balance')
        .getRawMany<{ id: number }>();

      for (const { id } of stakingIds) {
        try {
          const staking = await this.repository.findOneBy({ id });

          for (const balance of staking.balances) {
            if (balance.balance !== balance.stageOneBalance || balance.balance !== balance.stageTwoBalance)
              await this.updateStakingBalance(id, balance.asset);
          }
        } catch (e) {
          console.error(`Failed to update balance of staking ${id}:`, e);
        }
      }
    } catch (e) {
      console.error('Exception during balance update:', e);
    }
  }

  //*** HELPER METHODS ***//

  private async createStaking(
    userId: number,
    walletId: number,
    strategy: StakingStrategy,
    blockchain: Blockchain,
  ): Promise<Staking> {
    const depositAddress = await this.addressService.getAvailableAddress(BlockchainAddressReservationPurpose.STAKING);
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);
    const rewardStrategy = await this.getOrCreateRewardStrategy(userId);

    const staking = await this.factory.createStaking(
      userId,
      strategy,
      blockchain,
      depositAddress,
      withdrawalAddress,
      rewardStrategy,
    );

    return this.repository.save(staking);
  }

  private async getOrCreateRewardStrategy(userId: number): Promise<RewardStrategy | undefined> {
    const existingStrategy = await this.rewardStrategyRepository.findOneBy({ userId });
    if (existingStrategy) return existingStrategy;

    // create a new strategy
    try {
      const strategy = this.factory.createRewardStrategy(userId);
      return await this.rewardStrategyRepository.save(strategy);
    } catch {
      // retry the get (might have been created in meantime)
      return await this.rewardStrategyRepository.findOneBy({ userId });
    }
  }

  private async getBalances(manager: EntityManager, stakingId: number, assetId: number): Promise<StakingBalances> {
    /**
     * @warning
     * Assuming that deposits and withdrawals are in same asset as staking
     */
    const deposits = await new DepositRepository(manager).getConfirmedAmount(stakingId, assetId);
    const withdrawals = await new WithdrawalRepository(manager).getConfirmedAmount(stakingId, assetId);
    const stageOneDeposits = await new DepositRepository(manager).getConfirmedStageOneAmount(stakingId, assetId);
    const stageTwoDeposits = await new DepositRepository(manager).getConfirmedStageTwoAmount(stakingId, assetId);

    const currentBalance = Util.round(deposits - withdrawals, 8);

    return {
      currentBalance,
      stageOneBalance: Math.max(0, Util.round(currentBalance - stageOneDeposits, 8)),
      stageTwoBalance: Math.max(0, Util.round(currentBalance - stageTwoDeposits, 8)),
    };
  }

  private aggregateByAsset(items: (Deposit | Withdrawal)[]): AssetBalance[] {
    const amounts = items.reduce((prev, curr) => {
      prev[curr.asset.id] = (prev[curr.asset.id] ?? 0) + curr.amount;
      return prev;
    }, {} as { [assetId: number]: number });

    return Object.entries(amounts).map(([assetId, amount]) => ({ assetId: +assetId, balance: amount }));
  }
}
