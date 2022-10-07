import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { SignatureDto } from '../../application/dto/signature.dto';
import { SignedTransactionDto } from '../../application/dto/signed-transaction.dto';
import { TransactionDto } from '../../application/dto/transaction.dto';
import { TransactionService } from '../../application/services/transaction.service';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('open')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  getOpenTransactions(): TransactionDto[] {
    return this.transactionService.getOpen();
  }

  @Get('verified')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  getVerifiedTransactions(): TransactionDto[] {
    return this.transactionService.getVerified();
  }

  @Put(':id/verified')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  verifyTransaction(@Param('id') id: string, @Body() dto: SignatureDto) {
    this.transactionService.verified(id, dto.signature);
  }

  @Put(':id/signed')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  signTransaction(@Param('id') id: string, @Body() dto: SignedTransactionDto) {
    this.transactionService.signed(id, dto.hex);
  }
}
