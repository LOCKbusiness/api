import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { StakingDepositService } from 'src/subdomains/staking/application/services/staking-deposit.service';
import { StakingRewardService } from 'src/subdomains/staking/application/services/staking-reward.service';
import { StakingWithdrawalService } from 'src/subdomains/staking/application/services/staking-withdrawal.service';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { DbQueryDto } from 'src/subdomains/support/application/dto/db-query.dto';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { DataSource } from 'typeorm';
import { SupportDataQuery, SupportReturnData } from '../dto/support-data.dto';

export enum SupportTable {
  USER = 'user',
  WALLET = 'wallet',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REWARD = 'reward',
  STAKING = 'staking',
}

@Injectable()
export class SupportService {
  constructor(
    private readonly repos: RepositoryFactory,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly depositService: StakingDepositService,
    private readonly withdrawalService: StakingWithdrawalService,
    private readonly rewardService: StakingRewardService,
    private readonly stakingService: StakingService,
  ) {}

  async getRawData(query: DbQueryDto): Promise<any> {
    const request = this.dataSource
      .createQueryBuilder()
      .from(query.table, query.table)
      .orderBy(`${query.table}.id`, query.sorting)
      .limit(query.maxLine)
      .where(`${query.table}.id >= :id`, { id: query.min })
      .andWhere(`${query.table}.updated >= :updated`, { updated: query.updatedSince });

    if (query.select) request.select(query.select);

    for (const where of query.where) {
      request.andWhere(where[0], where[1]);
    }

    for (const join of query.join) {
      request.leftJoin(join[0], join[1]);
    }

    const data = await request.getRawMany().catch((e: Error) => {
      throw new BadRequestException(e.message);
    });

    // transform to array
    return this.transformResultArray(data, query.table);
  }

  async getSupportData(query: SupportDataQuery): Promise<SupportReturnData> {
    const user = await this.getUser(query);
    if (!user) throw new NotFoundException('User not found');

    const deposits = await this.repos.deposit.getByUserId(user.id);
    const withdrawals = await this.repos.withdrawal.getByUserId(user.id);
    const rewards = await this.repos.reward.getByUserId(user.id);

    return {
      user,
      deposits,
      withdrawals,
      rewards,
    };
  }

  //*** HELPER METHODS ***//

  private async getUser(query: SupportDataQuery): Promise<User> {
    switch (query.table) {
      case SupportTable.USER:
        return this.userService.getUserByKey(query.key, query.value);
      case SupportTable.WALLET:
        return this.walletService.getWalletByKey(query.key, query.value).then((wallet) => wallet?.user);
      case SupportTable.DEPOSIT:
        return this.userService.getUser(
          await this.depositService.getDepositByKey(query.key, query.value).then((deposit) => deposit?.staking.userId),
        );
      case SupportTable.WITHDRAWAL:
        return this.userService.getUser(
          await this.withdrawalService
            .getWithdrawalByKey(query.key, query.value)
            .then((withdrawal) => withdrawal?.staking.userId),
        );
      case SupportTable.REWARD:
        return this.userService.getUser(
          await this.rewardService.getRewardByKey(query.key, query.value).then((reward) => reward?.staking.userId),
        );
      case SupportTable.STAKING:
        return this.userService.getUser(
          await this.stakingService.getStakingByKey(query.key, query.value).then((staking) => staking?.userId),
        );
    }
  }

  private transformResultArray(
    data: any[],
    table: string,
  ): {
    keys: string[];
    values: any;
  } {
    // transform to array
    return data.length > 0
      ? {
          keys: this.renameDbKeys(table, Object.keys(data[0])),
          values: data.map((e) => Object.values(e)),
        }
      : undefined;
  }

  private renameDbKeys(table: string, keys: string[]): string[] {
    return keys.map((k) => k.replace(`${table}_`, '')).map((k) => (k.includes('_') ? this.toDotSeparation(k) : k));
  }

  private toDotSeparation(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).split('_').join('.');
  }
}
