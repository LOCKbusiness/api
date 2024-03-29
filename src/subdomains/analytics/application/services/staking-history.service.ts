import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { CompactHistoryTransactionType, CompactHistoryDto } from '../dto/output/history.dto';
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
import { ExportDataType, HistoryQuery } from '../dto/input/history-query.dto';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';

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
    private readonly stakingService: StakingService,
  ) {}

  async getHistory<T extends ExportType>(
    query: HistoryQuery,
    exportFormat: T,
    dataType: ExportDataType,
  ): Promise<HistoryDto<T>[] | StreamableFile> {
    const userId = query.userAddress ? (await this.userService.getUserByAddressOrThrow(query.userAddress)).id : null;

    const deposits = await this.getDepositsByUserOrAddress(userId, query.depositAddress, query.from, query.to);
    const withdrawals = await this.getWithdrawalsByUserOrAddress(userId, query.depositAddress, query.from, query.to);
    const rewards = await this.getRewardsByUserOrAddress(userId, query.depositAddress, query.from, query.to);

    const stakings =
      rewards.length === 0 ? [] : await this.stakingService.getStakingsByUserId(rewards[0].staking.userId);

    const addressMap = stakings.reduce(
      (map, s) => map.set(s.depositAddress.address, s.strategy),
      new Map<string, StakingStrategy>(),
    );

    let txArray: HistoryDto<T>[];

    switch (exportFormat) {
      case ExportType.COIN_TRACKING:
        txArray = (await this.getHistoryCT(deposits, withdrawals, rewards)) as HistoryDto<T>[];
        break;
      case ExportType.CHAIN_REPORT:
        txArray = this.getHistoryChainReport(deposits, withdrawals, rewards, addressMap) as HistoryDto<T>[];
        break;
      case ExportType.COMPACT:
        txArray = this.getHistoryCompact(deposits, withdrawals, rewards, addressMap) as HistoryDto<T>[];
        break;
    }

    return dataType === ExportDataType.CSV
      ? this.getHistoryCsv(txArray, exportFormat)
      : txArray.map((tx) => Util.removeNullFields(tx));
  }

  // --- HELPER METHODS --- //
  private getHistoryCsv<T>(tx: HistoryDto<T>[], exportType: ExportType): StreamableFile {
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return new StreamableFile(
      Readable.from([exportType === ExportType.CHAIN_REPORT ? this.toCsv(tx, ';', true) : this.toCsv(tx)]),
    );
  }

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

  private async getHistoryCT(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
  ): Promise<CoinTrackingCsvHistoryDto[]> {
    const uniqueTargetAddresses = withdrawals
      .map((w) => w.staking.withdrawalAddress.address)
      .concat(rewards.filter((r) => !r.isReinvest).map((r) => r.targetAddress.address))
      .filter((a1, i, self) => i === self.findIndex((a2) => a1 === a2));

    const wallets = await this.walletService.getWalletsByAddresses(uniqueTargetAddresses);

    const providerMap = wallets.reduce(
      (map, w) => map.set(w.address.address, w.walletProvider.name),
      new Map<string, string>(),
    );

    const transactions: CoinTrackingCsvHistoryDto[] = [
      CoinTrackingHistoryDtoMapper.mapStakingDeposits(deposits),
      CoinTrackingHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CoinTrackingHistoryDtoMapper.mapStakingRewards(rewards, providerMap),
    ].reduce((prev, curr) => prev.concat(curr), []);

    return this.filterDuplicateTxCT(transactions).sort((tx1, tx2) =>
      tx1.date.getTime() > tx2.date.getTime() ? -1 : 1,
    );
  }

  private getHistoryChainReport(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
    addressMap: Map<string, StakingStrategy>,
  ): ChainReportCsvHistoryDto[] {
    const transactions: ChainReportCsvHistoryDto[] = [
      ChainReportHistoryDtoMapper.mapStakingDeposits(deposits),
      ChainReportHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      ChainReportHistoryDtoMapper.mapStakingRewards(rewards, addressMap),
    ].reduce((prev, curr) => prev.concat(curr), []);

    return this.filterDuplicateTxChainReport(transactions).sort((tx1, tx2) =>
      tx1.timestamp.getTime() > tx2.timestamp.getTime() ? -1 : 1,
    );
  }

  private getHistoryCompact(
    deposits: Deposit[],
    withdrawals: Withdrawal[],
    rewards: Reward[],
    addressMap: Map<string, StakingStrategy>,
  ): CompactHistoryDto[] {
    const transactions: CompactHistoryDto[] = [
      CompactHistoryDtoMapper.mapStakingDeposits(deposits),
      CompactHistoryDtoMapper.mapStakingWithdrawals(withdrawals),
      CompactHistoryDtoMapper.mapStakingRewards(rewards, addressMap),
    ].reduce((prev, curr) => prev.concat(curr), []);

    return this.filterDuplicateTxCompact(transactions).sort((tx1, tx2) =>
      tx1.date.getTime() > tx2.date.getTime() ? -1 : 1,
    );
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
    return (
      Array.from(Util.groupBy(transactions, 'txId').values())
        // filter out reward-deposits
        .map((transactions) =>
          transactions.some((t) => t.transactionType === ChainReportTransactionType.DEPOSIT) &&
          transactions.some(
            (t) =>
              t.transactionType === ChainReportTransactionType.STAKING ||
              t.transactionType === ChainReportTransactionType.LM,
          )
            ? transactions.filter(
                (t) =>
                  t.transactionType === ChainReportTransactionType.STAKING ||
                  t.transactionType === ChainReportTransactionType.LM,
              )
            : transactions,
        )
        // enumerate duplicate TX IDs
        .map((transactions) =>
          transactions.length === 1
            ? transactions
            : transactions.map((t, i) => Object.assign(t, { txId: i == 0 ? t.txId : `${t.txId}-${i}` })),
        )
        .reduce((prev, curr) => prev.concat(curr), [])
    );
  }

  private filterDuplicateTxCT(transactions: CoinTrackingCsvHistoryDto[]): CoinTrackingCsvHistoryDto[] {
    return (
      Array.from(Util.groupBy(transactions, 'txId').values())
        // filter out reward-deposits
        .map((transactions) =>
          transactions.some((t) => t.type === CoinTrackingTransactionType.DEPOSIT) &&
          transactions.some(
            (t) =>
              t.type === CoinTrackingTransactionType.STAKING || t.type === CoinTrackingTransactionType.REWARD_BONUS,
          )
            ? transactions.filter(
                (t) =>
                  t.type === CoinTrackingTransactionType.STAKING || t.type === CoinTrackingTransactionType.REWARD_BONUS,
              )
            : transactions,
        )
        // enumerate duplicate TX IDs
        .map((transactions) =>
          transactions.length === 1
            ? transactions
            : transactions.map((t, i) => Object.assign(t, { txId: i == 0 ? t.txId : `${t.txId}-${i}` })),
        )
        .reduce((prev, curr) => prev.concat(curr), [])
    );
  }

  private filterDuplicateTxCompact(transactions: CompactHistoryDto[]): CompactHistoryDto[] {
    return (
      Array.from(Util.groupBy(transactions, 'txId').values())
        // filter out reward-deposits
        .map((transactions) =>
          transactions.some((t) => t.type === CompactHistoryTransactionType.DEPOSIT) &&
          transactions.some((t) => t.type === CompactHistoryTransactionType.REWARD)
            ? transactions.filter((t) => t.type === CompactHistoryTransactionType.REWARD)
            : transactions,
        )
        .reduce((prev, curr) => prev.concat(curr), [])
    );
  }
}
