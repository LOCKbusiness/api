import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { Body, Post } from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { DbQueryDto } from 'src/subdomains/support/application/dto/db-query.dto';
import { SupportService } from '../../application/services/support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getRawDataDeprecated(
    @Query()
    query: DbQueryDto,
  ): Promise<{ keys: any; values: any }> {
    return this.supportService.getRawDataDeprecated(query);
  }

  @Post('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getRawData(
    @Body()
    query: DbQueryDto,
  ): Promise<{ keys: string[]; values: any }> {
    return this.supportService.getRawData(query);
  }

  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getSupportData(@Query('id') id: string): Promise<{
    staking: {
      deposits: Deposit[];
      withdrawals: Withdrawal[];
      rewards: Reward[];
    };
  }> {
    return this.supportService.getSupportData(+id);
  }
}
