import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { HistoryTransactionType, CompactHistoryDto } from '../dto/output/history.dto';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { CoinTrackingCsvHistoryDto, CoinTrackingTransactionType } from '../dto/output/coin-tracking-history.dto';
import { Util } from 'src/shared/util';
import { CompactHistoryDtoMapper } from '../mappers/compact-history-dto.mapper';
import { CoinTrackingHistoryDtoMapper } from '../mappers/coin-tracking-history-dto.mapper';
import { ChainReportCsvHistoryDto, ChainReportTransactionType } from '../dto/output/chain-report-history.dto';
import { ChainReportHistoryDtoMapper } from '../mappers/chain-report-history-dto.mapper';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { HistoryQuery } from '../dto/input/history-query.dto';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';

export type HistoryDto<T> = T extends ExportType.COMPACT
  ? CompactHistoryDto
  : T extends ExportType.COIN_TRACKING
  ? CoinTrackingCsvHistoryDto
  : ChainReportCsvHistoryDto;

export enum ExportType {
  COMPACT = 'compact',
  COIN_TRACKING = 'CoinTracking',
  CHAIN_REPORT = 'ChainReport',
}

@Injectable()
export class StakingHistoryService {
  constructor(
    private readonly repos: RepositoryFactory,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  async getHistoryCsv(query: HistoryQuery, exportType: ExportType): Promise<StreamableFile> {
    const tx = await this.getHistory(query, exportType);
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return new StreamableFile(
      Readable.from([exportType === ExportType.CHAIN_REPORT ? this.toCsv(tx, ';', true) : this.toCsv(tx)]),
    );
  }

  async getHistory<T extends ExportType>(query: HistoryQuery, exportFormat: T): Promise<HistoryDto<T>[]> {
    const userId = query.userAddress ? (await this.userService.getUserByAddressOrThrow(query.userAddress)).id : null;

    const deposits = await this.getDepositsByUserOrAddress(userId, query.depositAddress, query.from, query.to);
    const withdrawals = await this.getWithdrawalsByUserOrAddress(userId, query.depositAddress, query.from, query.to);
    const rewards = await this.getRewardsByUserOrAddress(userId, query.depositAddress, query.from, query.to);

    const uniqueTargetAddresses = withdrawals
      .map((w) => w.staking.withdrawalAddress.address)
      .concat(rewards.filter((r) => !r.isReinvest).map((r) => r.targetAddress.address))
      .filter((a1, i, self) => i === self.findIndex((a2) => a1 === a2));

    const wallets = await this.walletService.getWalletsByAddresses(uniqueTargetAddresses);

    const providerMap = wallets.reduce(
      (map, w) => map.set(w.address.address, w.walletProvider.name),
      new Map<string, string>(),
    );

    switch (exportFormat) {
      case ExportType.COIN_TRACKING:
        return this.getHistoryCT(deposits, withdrawals, rewards, providerMap) as HistoryDto<T>[];
      case ExportType.CHAIN_REPORT:
        return this.getHistoryChainReport(deposits, withdrawals, rewards) as HistoryDto<T>[];
      case ExportType.COMPACT:
        return this.getHistoryCompact(deposits, withdrawals, rewards, providerMap) as HistoryDto<T>[];
    }
  }

  // --- HELPER METHODS --- //
  private async getDepositsByUserOrAddress(
    userId: number,
    depositAddress: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Deposit[]> {
    return userId
      ? this.repos.deposit.getByUserId(userId, dateFrom, dateTo)
      : this.repos.deposit.getByDepositAddress(depositAddress, dateFrom, dateTo);
  }

  private async getWithdrawalsByUserOrAddress(
    userId: number,
    depositAddress: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Withdrawal[]> {
    return userId
      ? this.repos.withdrawal.getByUserId(userId, dateFrom, dateTo)
      : this.repos.withdrawal.getByDepositAddress(depositAddress, dateFrom, dateTo);
  }

  private async getRewardsByUserOrAddress(
    userId: number,
    depositAddress: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Reward[]> {
    return userId
      ? this.repos.reward.getByUserId(userId, dateFrom, dateTo)
      : this.repos.reward.getByDepositAddress(depositAddress, dateFrom, dateTo);
  }

  private getHistoryCT(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
    providerMap: Map<string, string>,
  ): CoinTrackingCsvHistoryDto[] {
    const transactions: CoinTrackingCsvHistoryDto[] = [
      CoinTrackingHistoryDtoMapper.mapStakingDeposits(deposits),
      CoinTrackingHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CoinTrackingHistoryDtoMapper.mapStakingRewards(rewards, providerMap),
    ]
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));

    return this.filterDuplicateTxCT(transactions);
  }

  private getHistoryChainReport(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
  ): ChainReportCsvHistoryDto[] {
    const transactions: ChainReportCsvHistoryDto[] = [
      ChainReportHistoryDtoMapper.mapStakingDeposits(deposits),
      ChainReportHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      ChainReportHistoryDtoMapper.mapStakingRewards(rewards),
    ]
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.timestamp.getTime() > tx2.timestamp.getTime() ? -1 : 1));

    return this.filterDuplicateTxChainReport(transactions);
  }

  private getHistoryCompact(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
    providerMap: Map<string, string>,
  ): CompactHistoryDto[] {
    const transactions: CompactHistoryDto[] = [
      CompactHistoryDtoMapper.mapStakingDeposits(deposits),
      CompactHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CompactHistoryDtoMapper.mapStakingRewards(rewards, providerMap),
    ]
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));

    return this.filterDuplicateTxCompact(transactions);
  }

  private toCsv(list: any[], separator = ',', toGermanLocalDateString = false): string {
    const headers = Object.keys(list[0]).join(separator);
    const values = list.map((t) =>
      Object.values(t)
        .map((v) =>
          v instanceof Date
            ? toGermanLocalDateString
              ? v.toLocaleString('de-DE', { timeZone: 'CET' })
              : v.toISOString()
            : v,
        )
        .join(separator),
    );
    return [headers].concat(values).join('\n');
  }

  private filterDuplicateTxChainReport(transactions: ChainReportCsvHistoryDto[]): ChainReportCsvHistoryDto[] {
    Array.from(Util.groupBy(transactions, 'txId'))
      .map(([_, transactions]) => transactions)
      .filter((r) => r.length > 1)
      .forEach((transactions) =>
        transactions.forEach(
          (r, _) => (r.txId = r.transactionType === ChainReportTransactionType.DEPOSIT ? 'remove' : r.txId),
        ),
      );

    return transactions.filter((r) => r.txId !== 'remove');
  }

  private filterDuplicateTxCT(transactions: CoinTrackingCsvHistoryDto[]): CoinTrackingCsvHistoryDto[] {
    Array.from(Util.groupBy(transactions, 'txId'))
      .map(([_, transactions]) => transactions)
      .filter((r) => r.length > 1)
      .forEach((transactions) =>
        transactions.forEach((r, _) => (r.txId = r.type === CoinTrackingTransactionType.DEPOSIT ? 'remove' : r.txId)),
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
