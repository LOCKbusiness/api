import { Controller, UseGuards, Get, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingRepository } from 'src/subdomains/staking/application/repositories/staking.repository';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { getConnection } from 'typeorm';
import { dbQueryDto } from '../../application/dto/db-query.dto';
import { UserService } from '../../application/services/user.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly userService: UserService, private readonly stakingRepo: StakingRepository) {}

  @Get('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getRawData(
    @Query()
    query: dbQueryDto,
  ): Promise<any> {
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

  @Get('support')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getSupportData(@Query('id') id: string): Promise<{
    deposits: Deposit[];
    withdrawals: Withdrawal[];
    rewards: Reward[];
  }> {
    const user = await this.userService.getUser(+id);
    if (!user) throw new NotFoundException('User not found');

    const stakingEntities = await this.stakingRepo.find({
      where: { userId: +id },
      relations: ['deposits', 'withdrawals', 'rewards'],
    });

    const deposits = stakingEntities.reduce((prev, curr) => prev.concat(curr.deposits), [] as Deposit[]);
    const withdrawals = stakingEntities.reduce((prev, curr) => prev.concat(curr.withdrawals), [] as Withdrawal[]);
    const rewards = stakingEntities.reduce((prev, curr) => prev.concat(curr.rewards), [] as Reward[]);

    return {
      deposits: deposits,
      withdrawals: withdrawals,
      rewards: rewards,
    };
  }
}
