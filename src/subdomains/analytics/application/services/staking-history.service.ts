import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { HistoryTransactionType, CompactHistoryDto } from '../dto/output/history.dto';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { CoinTrackingCsvHistoryDto } from '../dto/output/coin-tracking-history.dto';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { Util } from 'src/shared/util';
import { CompactHistoryDtoMapper } from '../mappers/compact-history-dto.mapper';
import { CoinTrackingHistoryDtoMapper } from '../mappers/coin-tracking-history-dto.mapper';

type HistoryDto<T> = T extends ExportType.COMPACT ? CompactHistoryDto : CoinTrackingCsvHistoryDto;

export enum ExportType {
  COMPACT = 'compact',
  CT = 'CT',
}

export enum CoinTrackingTransactionTypes {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  STAKING = 'Staking',
}

@Injectable()
export class StakingHistoryService {
  constructor(private readonly stakingService: StakingService) {}

  async getHistoryCsv(userAddress: string, depositAddress: string, exportType: ExportType): Promise<StreamableFile> {
    const tx = await this.getHistory(userAddress, depositAddress, exportType);
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return new StreamableFile(Readable.from([this.toCsv(tx)]));
  }

  async getHistory<T extends ExportType>(
    userAddress: string,
    depositAddress: string,
    exportFormat: T,
  ): Promise<HistoryDto<T>[]> {
    const stakingEntities = await this.getStakingEntitiesByAddress(userAddress, depositAddress);
    const deposits = stakingEntities.reduce((prev, curr) => prev.concat(curr.deposits), [] as Deposit[]);
    const withdrawals = stakingEntities.reduce((prev, curr) => prev.concat(curr.withdrawals), [] as Withdrawal[]);
    const rewards = stakingEntities.reduce((prev, curr) => prev.concat(curr.rewards), [] as Reward[]);

    const transactions = (
      exportFormat === ExportType.CT
        ? this.getHistoryCT(deposits, withdrawals, rewards)
        : this.getHistoryCompact(deposits, withdrawals, rewards)
    ) as HistoryDto<T>[];

    return transactions;
  }

  // --- HELPER METHODS --- //
  private async getStakingEntitiesByAddress(userAddress: string, depositAddress: string): Promise<Staking[]> {
    return userAddress
      ? await this.stakingService.getStakingsByUserAddress(userAddress)
      : await this.stakingService.getStakingsByDepositAddress(depositAddress);
  }

  private getHistoryCT(deposits: Deposit[], withdrawals: Withdrawal[], rewards: Reward[]): CoinTrackingCsvHistoryDto[] {
    const transactions: CoinTrackingCsvHistoryDto[] = [
      CoinTrackingHistoryDtoMapper.mapStakingDeposits(deposits),
      CoinTrackingHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CoinTrackingHistoryDtoMapper.mapStakingRewards(rewards),
    ]
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));

    return this.filterDuplicateTxCT(transactions);
  }

  private getHistoryCompact(deposits: Deposit[], withdrawals: Withdrawal[], rewards: Reward[]): CompactHistoryDto[] {
    const transactions: CompactHistoryDto[] = [
      CompactHistoryDtoMapper.mapStakingDeposits(deposits),
      CompactHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CompactHistoryDtoMapper.mapStakingRewards(rewards),
    ]
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));

    return this.filterDuplicateTxCompact(transactions);
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

  private filterDuplicateTxCT(transactions: CoinTrackingCsvHistoryDto[]): CoinTrackingCsvHistoryDto[] {
    Array.from(Util.groupBy(transactions, 'txId'))
      .map(([_, transactions]) => transactions)
      .filter((r) => r.length > 1)
      .forEach((transactions) =>
        transactions.forEach((r, _) => (r.txId = r.type === CoinTrackingTransactionTypes.DEPOSIT ? 'remove' : r.txId)),
      );

    return transactions.filter((r) => r.txId !== 'remove');
  }

  private filterDuplicateTxCompact(transactions: CompactHistoryDto[]): CompactHistoryDto[] {
    Array.from(Util.groupBy(transactions, 'txId'))
      .map(([_, transactions]) => transactions)
      .filter((r) => r.length > 1)
      .forEach((transactions) =>
        transactions.forEach((r, _) => (r.txId = r.type === HistoryTransactionType.DEPOSIT ? 'remove' : r.txId)),
      );

    return transactions.filter((r) => r.txId !== 'remove');
  }
}
