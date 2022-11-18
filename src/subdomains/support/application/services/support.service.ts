import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DbQueryDto } from 'src/subdomains/support/application/dto/db-query.dto';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { getConnection } from 'typeorm';

@Injectable()
export class SupportService {
  constructor(private readonly userService: UserService, private readonly stakingService: StakingService) {}

  async getRawData(query: DbQueryDto): Promise<{ keys: any; values: any }> {
    const id = query.min ? +query.min : 1;
    const maxResult = query.maxLine ? +query.maxLine : undefined;
    const updated = query.updatedSince ? new Date(query.updatedSince) : new Date(0);

    const data = await getConnection()
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

  async getSupportData(userId: number): Promise<{
    staking: {
      deposits: Deposit[];
      withdrawals: Withdrawal[];
      rewards: Reward[];
    };
  }> {
    const user = await this.userService.getUser(userId);
    if (!user) throw new NotFoundException('User not found');

    const stakingEntities = await this.stakingService.getStakingsByUserId(userId);

    const deposits = stakingEntities.reduce((prev, curr) => prev.concat(curr.deposits), [] as Deposit[]);
    const withdrawals = stakingEntities.reduce((prev, curr) => prev.concat(curr.withdrawals), [] as Withdrawal[]);
    const rewards = stakingEntities.reduce((prev, curr) => prev.concat(curr.rewards), [] as Reward[]);

    return {
      staking: {
        deposits,
        withdrawals,
        rewards,
      },
    };
  }
}
