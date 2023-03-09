import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { MasternodeService } from '../../application/services/masternode.service';
import { AddMasternodeFee } from '../../application/dto/add-masternode-fee.dto';

@ApiTags('Masternode')
@Controller('masternode')
export class MasternodeController {
  constructor(private readonly masternodeService: MasternodeService) {}

  @Get()
  @ApiOkResponse({ type: String, isArray: true })
  async getMasternodes(): Promise<string[]> {
    return this.masternodeService.getAllOwner();
  }

  @Get('voters')
  @ApiOkResponse({ type: Number })
  async getMasternodeCount(): Promise<number> {
    return this.masternodeService.getAllVoters().then((l) => l.length);
  }

  // --- ADMIN --- //

  @Post('operator-sync')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async syncOperators() {
    await this.masternodeService.syncOperators();
  }

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
  async addFee(@Body() dto: AddMasternodeFee) {
    await this.masternodeService.addFee(dto.feeAmount);
  }
}
