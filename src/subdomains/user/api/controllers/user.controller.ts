import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { AuthGuard } from '@nestjs/passport';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { WalletService } from '../../application/services/wallet.service';
import { WalletDetailedDto } from '../../application/dto/wallet-detailed.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly walletService: WalletService) {}

  // --- USER --- //

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 200, type: WalletDetailedDto })
  async getUser(@GetJwt() jwt: JwtPayload): Promise<WalletDetailedDto> {
    return this.walletService.getWalletDto(jwt.walletId);
  }
}
