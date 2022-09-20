import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { AuthGuard } from '@nestjs/passport';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserDto } from '../../application/dto/user.dto';
import { WalletService } from '../../application/services/wallet.service';
import { User } from '../../domain/entities/user.entity';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly walletService: WalletService) {}

  // --- USER --- //

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 200, type: UserDto })
  async getUser(@GetJwt() jwt: JwtPayload): Promise<UserDto> {
    return this.walletService.getWalletDto(jwt.id);
  }

  // --- PAYOUT MANAGER --- //

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.PAYOUT_MANAGER))
  async getAllUser(): Promise<User[]> {
    return this.getAllUser();
  }
}
