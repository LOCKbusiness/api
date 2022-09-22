import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { CreateMasternodeDto } from '../../application/dto/input/create-masternode.dto';
import { PrepareResignMasternodeDto } from '../../application/dto/input/prepare-resign-masternode.dto';
import { ResignMasternodeDto } from '../../application/dto/input/resign-masternode.dto';
import { MasternodeService } from '../../application/services/masternode.service';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState } from '../../domain/enums';

@ApiTags('masternode')
@Controller('masternode')
export class MasternodeController {
  constructor(private readonly masternodeService: MasternodeService) {}

  // --- ADMIN --- //

  @Get('unpaidFee')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  getUnpaidFee(): Promise<number> {
    return this.masternodeService.getUnpaidFee();
  }

  // --- MANAGERS --- //

  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard([WalletRole.MASTERNODE_MANAGER, WalletRole.PAYOUT_MANAGER]))
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

  @Put(':id/confirmResign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.PAYOUT_MANAGER))
  confirmResignMasternode(@Param('id') id: string, @Body() dto: PrepareResignMasternodeDto): Promise<Masternode> {
    return this.masternodeService.prepareResign(+id, dto.signature, MasternodeState.RESIGN_CONFIRMED);
  }

  @Put(':id/resign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  async resignMasternode(@Param('id') id: string, @Body() dto: ResignMasternodeDto): Promise<Masternode> {
    return this.masternodeService.resign(+id, dto);
  }

  @Put(':id/resigned')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  async resignedMasternode(@Param('id') id: string): Promise<Masternode> {
    return this.masternodeService.resigned(+id);
  }
}
