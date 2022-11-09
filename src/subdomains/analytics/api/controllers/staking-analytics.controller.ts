import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { StakingDepositService } from 'src/subdomains/staking/application/services/staking-deposit.service';
import { StakingWithdrawalService } from 'src/subdomains/staking/application/services/staking-withdrawal.service';
import { StakingAnalyticsOutputDto } from '../../application/dto/output/staking-analytics.output.dto';
import { TimespanDto } from '../../application/dto/output/timespan.dto';
import { StakingTransactionDto } from '../../application/dto/output/transactions.dto';
import { StakingAnalyticsService } from '../../application/services/staking-analytics.service';

@ApiTags('Analytics')
@Controller('analytics/staking')
export class StakingAnalyticsController {
  constructor(
    private readonly stakingAnalyticsService: StakingAnalyticsService,
    private readonly stakingDepositService: StakingDepositService,
    private readonly stakingWithdrawalService: StakingWithdrawalService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: StakingAnalyticsOutputDto })
  async getStakingAnalytics(): Promise<StakingAnalyticsOutputDto> {
    return this.stakingAnalyticsService.getStakingAnalyticsCache();
  }

  @Get('transactions')
  @ApiResponse({ status: 200, type: StakingTransactionDto })
  async getTransactions(@Query() timespanDto: TimespanDto): Promise<StakingTransactionDto> {
    return {
      deposits: await this.stakingDepositService.getDeposits(timespanDto.dateFrom, timespanDto.dateTo),
      withdrawals: await this.stakingWithdrawalService.getWithdrawals(timespanDto.dateFrom, timespanDto.dateTo),
    };
  }
}
