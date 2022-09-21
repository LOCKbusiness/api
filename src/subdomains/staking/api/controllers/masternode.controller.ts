import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { CreateMasternodeDto } from '../../application/dto/create-masternode.dto';
import { ResignMasternodeDto } from '../../application/dto/resign-masternode.dto';
import { MasternodeService } from '../../application/services/masternode.service';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState } from '../../domain/enums';

@ApiTags('masternode')
@Controller('masternode')
export class MasternodeController {
  constructor(private readonly masternodeService: MasternodeService) {}

  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(
    AuthGuard(),
    new RoleGuard([WalletRole.MASTERNODE_MANAGER, WalletRole.LIQUIDITY_MANAGER, WalletRole.PAYOUT_MANAGER]),
  )
  getMasternodes(): Promise<Masternode[]> {
    return this.masternodeService.get();
  }

  @Put(':id/create')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  createMasternode(@Param('id') id: string, @Body() dto: CreateMasternodeDto): Promise<Masternode> {
    return this.masternodeService.create(+id, dto);
  }

  @Put(':id/requestResign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.LIQUIDITY_MANAGER))
  requestResignMasternode(@Param('id') id: string, @Body() signature: string): Promise<Masternode> {
    return this.masternodeService.prepareResign(+id, signature, MasternodeState.RESIGN_REQUESTED);
  }

  @Put(':id/confirmResign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.PAYOUT_MANAGER))
  confirmResignMasternode(@Param('id') id: string, @Body() signature: string): Promise<Masternode> {
    return this.masternodeService.prepareResign(+id, signature, MasternodeState.RESIGN_CONFIRMED);
  }

  @Put(':id/resign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  async resignMasternode(@Param('id') id: string, @Body() dto: ResignMasternodeDto): Promise<Masternode> {
    return this.masternodeService.resign(+id, dto);
  }
}
