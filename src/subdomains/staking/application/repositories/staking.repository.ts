import { Util } from 'src/shared/util';
import { EntityRepository, getCustomRepository, Repository } from 'typeorm';
import { Staking, StakingType } from '../../domain/entities/staking.entity';
import { DepositRepository } from './deposit.repository';
import { WithdrawalRepository } from './withdrawal.repository';

export interface StakingBalances {
  currentBalance: number;
  stageOneBalance: number;
  stageTwoBalance: number;
}
@EntityRepository(Staking)
export class StakingRepository extends Repository<Staking> {
  async updateConcurrently(update: () => Promise<Staking>): Promise<Staking> {
    return Util.retry(async () => {
      const staking = await update();

      // TODO -> check if response type is correct
      await this.createQueryBuilder('staking')
        .setLock('optimistic', staking.updated)
        .update(Staking)
        // .set({ ...staking })
        .set({ rewardsAmount: staking.rewardsAmount })
        .where('id = :id', { id: staking.id })
        .execute();
      // .then((response) => response.raw[0])

      return this.findOne({ id: staking.id });
    }, 3);
  }

  async getBalances(stakingId: number): Promise<StakingBalances> {
    /**
     * @warning
     * Assuming that deposits and withdrawals are in same asset as staking
     */
    const deposits = await getCustomRepository(DepositRepository).getConfirmedAmount(stakingId);
    const withdrawals = await getCustomRepository(WithdrawalRepository).getConfirmedAmount(stakingId);
    const stageOneDeposits = await getCustomRepository(DepositRepository).getConfirmedStageOneAmount(stakingId);
    const stageTwoDeposits = await getCustomRepository(DepositRepository).getConfirmedStageTwoAmount(stakingId);

    const currentBalance = Util.round(deposits - withdrawals, 8);

    return {
      currentBalance,
      stageOneBalance: Math.max(0, Util.round(currentBalance - stageOneDeposits, 8)),
      stageTwoBalance: Math.max(0, Util.round(currentBalance - stageTwoDeposits, 8)),
    };
  }

  async getCurrentTotalStakingBalance({ asset, strategy }: StakingType): Promise<number> {
    return this.createQueryBuilder('staking')
      .select('SUM(balance)', 'balance')
      .where('staking.assetId = :id', { id: asset.id })
      .andWhere('staking.strategy = :strategy', { strategy })
      .getRawOne<{ balance: number }>()
      .then((b) => b.balance);
  }

  /**
   * @note
   * assuming withdrawals and deposits are in the same asset as staking
   */
  async getUnconfirmedDepositsAndWithdrawalsAmounts(
    stakingId: number,
  ): Promise<{ deposits: number; withdrawals: number }> {
    const deposits = await getCustomRepository(DepositRepository).getInProgressAmount(stakingId);
    const withdrawals = await getCustomRepository(WithdrawalRepository).getInProgressAmount(stakingId);

    return { deposits, withdrawals };
  }

  async getByUserId(userId: number, type?: StakingType): Promise<Staking[]> {
    return this.find({ userId, ...type });
  }

  async getByDepositAddress(depositAddress: string): Promise<Staking[]> {
    return this.find({ depositAddress: { address: depositAddress } });
  }
}
