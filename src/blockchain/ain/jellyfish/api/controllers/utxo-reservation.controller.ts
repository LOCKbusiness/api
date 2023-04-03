import { Controller, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UtxoReservationService } from '../../services/utxo-reservation.service';

@ApiTags('UTXO Reservation')
@Controller('utxo-reservation')
export class UtxoReservationController {
  constructor(private readonly utxoReservationService: UtxoReservationService) {}

  @Put('load')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async loadReservations() {
    await this.utxoReservationService.load();
  }
}
