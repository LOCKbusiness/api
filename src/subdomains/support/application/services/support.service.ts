import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DbQueryDto } from 'src/subdomains/support/application/dto/db-query.dto';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { DataSource } from 'typeorm';

@Injectable()
export class SupportService {
  constructor(
    private readonly repos: RepositoryFactory,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async getRawDataDeprecated(query: DbQueryDto): Promise<{ keys: any; values: any }> {
    const id = query.min ? +query.min : 1;
    const maxResult = query.maxLine ? +query.maxLine : undefined;
    const updated = query.updatedSince ? new Date(query.updatedSince) : new Date(0);

    const data = await this.dataSource
      .createQueryBuilder()
      .select(query.filterCols)
      .from(query.table, query.table)
      .where('id >= :id', { id })
      .andWhere('updated >= :updated', { updated })
      .orderBy('id', query.sorting)
      .take(maxResult)
      .getRawMany()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });

    // transform to array
    return data.length > 0
      ? {
          keys: Object.keys(data[0]),
          values: data.map((e) => Object.values(e)),
        }
      : undefined;
  }

  async getRawData(query: DbQueryDto): Promise<any> {
    const request = this.dataSource
      .createQueryBuilder()
      .from(query.table, query.table)
      .orderBy(`${query.table}.id`, query.sorting)
      .take(query.maxLine)
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

  async getSupportData(userId: number): Promise<{
    staking: {
      deposits: Deposit[];
      withdrawals: Withdrawal[];
      rewards: Reward[];
    };
  }> {
    const user = await this.userService.getUser(userId);
    if (!user) throw new NotFoundException('User not found');

    const deposits = await this.repos.deposit.getByUserId(userId);
    const withdrawals = await this.repos.withdrawal.getByUserId(userId);
    const rewards = await this.repos.reward.getByUserId(userId);

    return {
      staking: {
        deposits,
        withdrawals,
        rewards,
      },
    };
  }

  //*** HELPER METHODS ***//

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
