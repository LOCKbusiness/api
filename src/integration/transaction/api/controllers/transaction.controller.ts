import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { InvalidateDto } from '../../application/dto/invalidate.dto';
import { SignatureDto } from '../../application/dto/signature.dto';
import { SignedTransactionDto } from '../../application/dto/signed-transaction.dto';
import { TransactionOutputDto } from '../../application/dto/transaction.dto';
import { TransactionService } from '../../application/services/transaction.service';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

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
  verifyTransaction(@Param('id') id: string, @Body() dto: SignatureDto) {
    this.transactionService.verified(id, dto.signature);
  }

  @Put(':id/invalidated')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  invalidateTransaction(@Param('id') id: string, @Body() dto: InvalidateDto) {
    this.transactionService.invalidated(id, dto.reason);
  }

  @Put(':id/signed')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_SIGNER))
  signTransaction(@Param('id') id: string, @Body() dto: SignedTransactionDto) {
    this.transactionService.signed(id, dto.hex);
  }
}
