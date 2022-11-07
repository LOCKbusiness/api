import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { HistoryTransactionType, TypedHistoryDto } from '../dto/output/history.dto';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';

@Injectable()
export class StakingHistoryService {
  constructor(private readonly stakingService: StakingService) {}

  async getUserHistory(address: string): Promise<TypedHistoryDto[]> {
    const stakingEntities = await this.stakingService.getStakingsByUserAddress(address);
    const deposits = stakingEntities.reduce((prev, curr) => prev.concat(curr.deposits), [] as Deposit[]);
    const withdrawals = stakingEntities.reduce((prev, curr) => prev.concat(curr.withdrawals), [] as Withdrawal[]);
    const rewards = stakingEntities.reduce((prev, curr) => prev.concat(curr.rewards), [] as Reward[]);

    const transactions: TypedHistoryDto[] = await Promise.all([
      this.getStakingDepositHistory(deposits),
      this.getStakingWithdrawalHistory(withdrawals),
      this.getStakingRewardHistory(rewards),
    ]).then((r) => r.reduce((prev, curr) => prev.concat(curr), []));

    return transactions.sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));
  }

  async getDepositAddressHistory(address: string): Promise<TypedHistoryDto[]> {
    const stakingEntities = await this.stakingService.getStakingsByDepositAddress(address);
    const deposits = stakingEntities.reduce((prev, curr) => prev.concat(curr.deposits), [] as Deposit[]);
    const withdrawals = stakingEntities.reduce((prev, curr) => prev.concat(curr.withdrawals), [] as Withdrawal[]);
    const rewards = stakingEntities.reduce((prev, curr) => prev.concat(curr.rewards), [] as Reward[]);

    const transactions: TypedHistoryDto[] = await Promise.all([
      this.getStakingDepositHistory(deposits),
      this.getStakingWithdrawalHistory(withdrawals),
      this.getStakingRewardHistory(rewards),
    ]).then((r) => r.reduce((prev, curr) => prev.concat(curr), []));

    return transactions.sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));
  }

  async getHistoryCsv(userAddress: string, depositAddress: string): Promise<Readable> {
    const tx = userAddress
      ? await this.getUserHistory(userAddress)
      : await this.getDepositAddressHistory(depositAddress);
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return Readable.from([this.toCsv(tx)]);
  }

  // --- HELPER METHODS --- //
  private getStakingDepositHistory(deposits: Deposit[]): TypedHistoryDto[] {
    return deposits
      .map((c) => [
        {
          type: HistoryTransactionType.DEPOSIT,
          inputAmount: c.amount,
          inputAsset: c.asset.name,
          outputAmount: null,
          outputAsset: null,
          txId: c.payInTxId,
          date: c.created,
          status: c.status,
        },
      ])
      .reduce((prev, curr) => prev.concat(curr), [])
      .filter((e) => e != null);
  }

  private getStakingWithdrawalHistory(withdrawals: Withdrawal[]): TypedHistoryDto[] {
    return withdrawals
      .map((c) => [
        {
          type: HistoryTransactionType.WITHDRAWAL,
          inputAmount: null,
          inputAsset: null,
          outputAmount: c.amount,
          outputAsset: c.asset.name,
          txId: c.withdrawalTxId,
          date: c.outputDate,
          status: c.status,
        },
      ])
      .reduce((prev, curr) => prev.concat(curr), [])
      .filter((e) => e != null);
  }

  private getStakingRewardHistory(rewards: Reward[]): TypedHistoryDto[] {
    return rewards
      .map((c) => [
        {
          type: HistoryTransactionType.REWARD,
          inputAmount: c.amount,
          inputAsset: c.asset.name,
          outputAmount: null,
          outputAsset: null,
          txId: c.reinvestTxId,
          date: c.reinvestOutputDate,
          status: c.status,
        },
      ])
      .reduce((prev, curr) => prev.concat(curr), [])
      .filter((e) => e != null);
  }

  private toCsv(list: any[], separator = ','): string {
    const headers = Object.keys(list[0]).join(separator);
    const values = list.map((t) =>
      Object.values(t)
        .map((v) => (v instanceof Date ? v.toISOString() : v))
        .join(separator),
    );
    return [headers].concat(values).join('\n');
  }

  private createRandomDate(outputDate: Date, offset: number, amount: number): Date {
    return new Date(outputDate.getTime() + (offset - (amount % 10)) * 60 * 1000);
  }

  private getAssetSymbol(dexName: string): string {
    // TODO: use col from asset table to differentiate stocks and crypto token?
    return dexName === 'DUSD'
      ? 'DUSD4'
      : ['DFI', 'BTC', 'ETH', 'BCH', 'DOGE', 'LTC', 'USDC', 'USDT'].includes(dexName)
      ? dexName
      : `d${dexName}`;
  }
}
