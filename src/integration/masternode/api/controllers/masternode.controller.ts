import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { ResignMasternodeDto } from '../../application/dto/resign-masternode.dto';
import { MasternodeService } from '../../application/services/masternode.service';
import { Masternode } from '../../domain/entities/masternode.entity';
import { MasternodeState } from '../../../../subdomains/staking/domain/enums';
import { CreateMasternodeDto } from '../../application/dto/create-masternode.dto';
import { PrepareResignMasternodeDto } from '../../application/dto/prepare-resign-masternode.dto';
import { AddMasternodeFee } from '../../application/dto/add-masternode-fee.dto';
import { MasternodeManagerDto } from '../../application/dto/masternode-manager.dto';
import { RawTxCreateMasternodeDto } from '../../application/dto/raw-tx-create-masternode.dto';
import { RawTxResignMasternodeDto } from '../../application/dto/raw-tx-resign-masternode.dto';

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

  // --- MANAGERS --- //

  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard([WalletRole.MASTERNODE_MANAGER, WalletRole.PAYOUT_MANAGER]))
  getMasternodes(): Promise<Masternode[]> {
    return this.masternodeService.get();
  }

  @Get('creating')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard([WalletRole.MASTERNODE_MANAGER]))
  getMasternodesCreating(@Body() dto: MasternodeManagerDto): Promise<RawTxCreateMasternodeDto[]> {
    return this.masternodeService.getCreating(dto);
  }

  @Put(':id/create')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.MASTERNODE_MANAGER))
  createMasternode(@Param('id') id: string, @Body() dto: CreateMasternodeDto): Promise<Masternode> {
    return this.masternodeService.create(+id, dto);
  }

  @Put(':id/confirm-resign')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.PAYOUT_MANAGER))
  confirmResignMasternode(@Param('id') id: string, @Body() dto: PrepareResignMasternodeDto): Promise<Masternode> {
    return this.masternodeService.prepareResign(+id, dto.signature, MasternodeState.RESIGN_CONFIRMED);
  }

  @Get('resigning')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard([WalletRole.MASTERNODE_MANAGER]))
  getMasternodesResigning(@Body() dto: MasternodeManagerDto): Promise<RawTxResignMasternodeDto[]> {
    return this.masternodeService.getResigning(dto);
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
