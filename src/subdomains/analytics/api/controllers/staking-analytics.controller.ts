import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { StakingDepositService } from 'src/subdomains/staking/application/services/staking-deposit.service';
import { StakingWithdrawalService } from 'src/subdomains/staking/application/services/staking-withdrawal.service';
import { StakingAnalyticsFilterQuery } from '../../application/dto/input/staking-analytics-filter-query.dto';
import { StakingAnalyticsQuery } from '../../application/dto/input/staking-analytics-query.dto';
import { StakingAnalyticsUpdateQuery } from '../../application/dto/input/staking-analytics-update-query.dto';
import { UpdateStakingAnalyticsDto } from '../../application/dto/input/update-staking-analytics.dto';
import { StakingAnalyticsOutputDto } from '../../application/dto/output/staking-analytics.output.dto';
import { TimeSpanDto } from '../../application/dto/output/time-span.dto';
import { StakingTransactionDto } from '../../application/dto/output/transactions.dto';
import { StakingAnalyticsService } from '../../application/services/staking-analytics.service';
import { StakingAnalytics } from '../../domain/staking-analytics.entity';

@ApiTags('Analytics')
@Controller('analytics/staking')
export class StakingAnalyticsController {
  constructor(
    private readonly stakingAnalyticsService: StakingAnalyticsService,
    private readonly stakingDepositService: StakingDepositService,
    private readonly stakingWithdrawalService: StakingWithdrawalService,
  ) {}

  @Get()
  @ApiOkResponse({ type: StakingAnalyticsOutputDto })
  async getStakingAnalytics(@Query() query: StakingAnalyticsQuery): Promise<StakingAnalyticsOutputDto> {
    return this.stakingAnalyticsService.getStakingAnalyticsCache(query);
  }

  @Get('filter')
  @ApiOkResponse({ type: StakingAnalyticsOutputDto, isArray: true })
  async getFilteredStakingAnalytics(@Query() query: StakingAnalyticsFilterQuery): Promise<StakingAnalyticsOutputDto[]> {
    return this.stakingAnalyticsService.getFilteredStakingAnalyticsCache(query);
  }

  @Get('transactions')
  @ApiOkResponse({ type: StakingTransactionDto })
  async getTransactions(@Query() { dateFrom, dateTo }: TimeSpanDto): Promise<StakingTransactionDto> {
    return {
      deposits: await this.stakingDepositService.getDeposits(dateFrom, dateTo),
      withdrawals: await this.stakingWithdrawalService.getWithdrawals(dateFrom, dateTo),
    };
  }

  @Put()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async updateApr(
    @Query() query: StakingAnalyticsUpdateQuery,
    @Body() dto: UpdateStakingAnalyticsDto,
  ): Promise<StakingAnalytics> {
    return this.stakingAnalyticsService.update(query, dto);
  }
}
