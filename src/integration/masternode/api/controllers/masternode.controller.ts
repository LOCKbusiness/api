import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { MasternodeService } from '../../application/services/masternode.service';
import { AddMasternodeFee } from '../../application/dto/add-masternode-fee.dto';

@ApiTags('masternode')
@Controller('masternode')
export class MasternodeController {
  constructor(private readonly masternodeService: MasternodeService) {}

  // --- ADMIN --- //

  @Get('unpaid-fee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  getUnpaidFee(): Promise<number> {
    return this.masternodeService.getUnpaidFee();
  }

  @Post('paid-fee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  addFee(@Body() dto: AddMasternodeFee) {
    this.masternodeService.addFee(dto.feeAmount);
  }
}
