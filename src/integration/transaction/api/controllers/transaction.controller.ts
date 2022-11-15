import { Body, Controller, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { MonitoringService } from 'src/subdomains/monitoring/application/services/monitoring.service';
import { InvalidateDto } from '../../application/dto/invalidate.dto';
import { SignatureDto } from '../../application/dto/signature.dto';
import { SignedTransactionDto } from '../../application/dto/signed-transaction.dto';
import { TransactionOutputDto } from '../../application/dto/transaction.output.dto';
import { TransactionService } from '../../application/services/transaction.service';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly monitoring: MonitoringService,
  ) {}

  @Get('open')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  getOpenTransactions(): Promise<TransactionOutputDto[]> {
    return this.transactionService.getOpen();
  }

  @Get('verified')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_SIGNER))
  getVerifiedTransactions(): Promise<TransactionOutputDto[]> {
    return this.transactionService.getVerified();
  }

  @Put(':id/verified')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  async verifyTransaction(@Param('id') id: string, @Body() dto: SignatureDto, @Headers('Device-Id') deviceId: string) {
    await this.transactionService.verified(id, dto.signature);
    await this.onPing('tc-' + deviceId);
  }

  @Put(':id/invalidated')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  async invalidateTransaction(
    @Param('id') id: string,
    @Body() dto: InvalidateDto,
    @Headers('Device-Id') deviceId: string,
  ) {
    await this.transactionService.invalidated(id, dto.reason);
    await this.onPing('tc-' + deviceId);
  }

  @Put(':id/signed')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_SIGNER))
  async signTransaction(
    @Param('id') id: string,
    @Body() dto: SignedTransactionDto,
    @Headers('Device-Id') deviceId: string,
  ) {
    await this.transactionService.signed(id, dto.hex);
    await this.onPing('cw-' + deviceId);
  }

  private onPing(device: string): Promise<void> {
    return this.monitoring.onWebhook('staking', 'external', device);
  }
}
