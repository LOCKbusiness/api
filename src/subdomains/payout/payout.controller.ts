import { Controller, UseGuards, Body, Post, Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { PayoutService } from './services/payout.service';
import { PayoutRequest } from './interfaces';
import { PayoutOrderContext } from './entities/payout-order.entity';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';

@ApiTags('payout')
@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async doPayout(@Body() dto: PayoutRequest): Promise<void> {
    if (process.env.ENVIRONMENT === 'test') {
      return this.payoutService.doPayout(dto);
    }
  }

  @Get('completion')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async checkOrderCompletion(
    @Query('context') context: PayoutOrderContext,
    @Query('correlationId') correlationId: string,
  ): Promise<{ isComplete: boolean; payoutTxId: string }> {
    if (process.env.ENVIRONMENT === 'test') {
      return this.payoutService.checkOrderCompletion(context, correlationId);
    }
  }
}
