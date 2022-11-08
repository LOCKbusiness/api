import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { HistoryTransactionType, CompactHistoryDto } from '../dto/output/history.dto';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { CoinTrackingCsvHistoryDto } from '../dto/output/coin-tracking-history.dto';
import { DepositStatus, RewardStatus, WithdrawalStatus } from 'src/subdomains/staking/domain/enums';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';

type HistoryDto<T> = T extends ExportType.COMPACT ? CompactHistoryDto : CoinTrackingCsvHistoryDto;

export enum ExportType {
  COMPACT = 'compact',
  CT = 'CT',
}

@Injectable()
export class StakingHistoryService {
  constructor(private readonly stakingService: StakingService) {}

  async getHistoryCsv(userAddress: string, depositAddress: string, exportType: ExportType): Promise<Readable> {
    const tx = await this.getHistory(userAddress, depositAddress, exportType);
    if (tx.length === 0) throw new NotFoundException('No transactions found');
    return Readable.from([this.toCsv(tx)]);
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

    return (
      exportFormat === ExportType.CT
        ? this.getHistoryCT(deposits, withdrawals, rewards)
        : this.getHistoryCompact(deposits, withdrawals, rewards)
    ) as HistoryDto<T>[];
  }

  // --- HELPER METHODS --- //
  private async getStakingEntitiesByAddress(userAddress: string, depositAddress: string): Promise<Staking[]> {
    return userAddress
      ? await this.stakingService.getStakingsByUserAddress(userAddress)
      : await this.stakingService.getStakingsByDepositAddress(depositAddress);
  }

  private getHistoryCT(deposits: Deposit[], withdrawals: Withdrawal[], rewards: Reward[]): CoinTrackingCsvHistoryDto[] {
    const transactions: CoinTrackingCsvHistoryDto[][] = [
      this.getStakingDepositHistoryCT(deposits),
      this.getStakingWithdrawalHistoryCT(withdrawals),
      this.getStakingRewardHistoryCT(rewards),
    ];

    return transactions
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));
  }

  private getHistoryCompact(deposits: Deposit[], withdrawals: Withdrawal[], rewards: Reward[]): CompactHistoryDto[] {
    const transactions: CompactHistoryDto[][] = [
      this.getStakingDepositHistoryCompact(deposits),
      this.getStakingWithdrawalHistoryCompact(withdrawals),
      this.getStakingRewardHistoryCompact(rewards),
    ];

    return transactions
      .reduce((prev, curr) => prev.concat(curr), [])
      .sort((tx1, tx2) => (tx1.date.getTime() > tx2.date.getTime() ? -1 : 1));
  }

  // --- TO DTO --- //
  private getStakingDepositHistoryCompact(deposits: Deposit[]): CompactHistoryDto[] {
    return deposits
      .map((c) => ({
        type: HistoryTransactionType.DEPOSIT,
        inputAmount: c.amount,
        inputAsset: c.asset.name,
        outputAmount: null,
        outputAsset: null,
        txId: c.payInTxId,
        date: c.created,
        status: c.status,
      }))
      .filter((e) => e != null);
  }

  private getStakingWithdrawalHistoryCompact(withdrawals: Withdrawal[]): CompactHistoryDto[] {
    return withdrawals
      .map((c) => ({
        type: HistoryTransactionType.WITHDRAWAL,
        inputAmount: null,
        inputAsset: null,
        outputAmount: c.amount,
        outputAsset: c.asset.name,
        txId: c.withdrawalTxId,
        date: c.outputDate,
        status: c.status,
      }))
      .filter((e) => e != null);
  }

  private getStakingRewardHistoryCompact(rewards: Reward[]): CompactHistoryDto[] {
    return rewards
      .map((c) => ({
        type: HistoryTransactionType.REWARD,
        inputAmount: c.amount,
        inputAsset: c.asset.name,
        outputAmount: null,
        outputAsset: null,
        txId: c.reinvestTxId,
        date: c.reinvestOutputDate,
        status: c.status,
      }))
      .filter((e) => e != null);
  }

  private getStakingDepositHistoryCT(deposits: Deposit[]): CoinTrackingCsvHistoryDto[] {
    return deposits
      .filter((c) => c.status === DepositStatus.CONFIRMED)
      .map((c) => ({
        type: 'Deposit',
        buyAmount: c.amount,
        buyAsset: this.getAssetSymbol(c.asset.name),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: 'Staking',
        comment: 'LOCK Staking Deposit',
        txid: c.payInTxId,
        date: c.created,
        buyValueInEur: c.amountEur,
        sellValueInEur: null,
      }))
      .filter((e) => e != null);
  }

  private getStakingWithdrawalHistoryCT(withdrawals: Withdrawal[]): CoinTrackingCsvHistoryDto[] {
    return withdrawals
      .filter((c) => c.status === WithdrawalStatus.CONFIRMED)
      .map((c) => ({
        type: 'Withdrawal',
        buyAmount: null,
        buyAsset: null,
        sellAmount: c.amount,
        sellAsset: this.getAssetSymbol(c.asset.name),
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: null,
        comment: 'LOCK Staking Withdrawal',
        txid: c.withdrawalTxId,
        date: c.outputDate,
        buyValueInEur: null,
        sellValueInEur: c.amountEur,
      }))
      .filter((e) => e != null);
  }

  private getStakingRewardHistoryCT(rewards: Reward[]): CoinTrackingCsvHistoryDto[] {
    return rewards
      .filter((c) => c.status === RewardStatus.CONFIRMED)
      .map((c) => ({
        type: 'Staking',
        buyAmount: c.amount,
        buyAsset: this.getAssetSymbol(c.asset.name),
        sellAmount: null,
        sellAsset: null,
        fee: null,
        feeAsset: null,
        exchange: 'LOCK.space Staking',
        tradeGroup: 'Staking',
        comment: 'LOCK Staking Deposit',
        txid: c.reinvestTxId,
        date: c.reinvestOutputDate,
        buyValueInEur: c.amountEur,
        sellValueInEur: null,
      }))
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

  private getAssetSymbol(assetName: string): string {
    // TODO: use col from asset table to differentiate stocks and crypto token?
    return assetName === 'DUSD'
      ? 'DUSD4'
      : ['DFI', 'BTC', 'ETH', 'BCH', 'DOGE', 'LTC', 'USDC', 'USDT'].includes(assetName)
      ? assetName
      : `d${assetName}`;
  }
}
