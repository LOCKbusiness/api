import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { AuthGuard } from '@nestjs/passport';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { UserDto } from '../../application/dto/user.dto';
import { WalletService } from '../../application/services/wallet.service';
import { Config } from 'src/config/config';
import { RealIP } from 'nestjs-real-ip';
import { KycDataDto } from '../../application/dto/kyc-data.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly walletService: WalletService) {}

  // --- USER --- //
  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async getUser(@GetJwt() jwt: JwtPayload): Promise<UserDto> {
    return this.walletService.getWalletDto(jwt.id);
  }

  @Get('kycId')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async getKycId(@RealIP() ip: string, address: string): Promise<string> {
    this.checkWebhookIp(ip, address);
    return this.walletService.getKycIdByAddress(address);
  }

  @Post('handoverKyc')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async handoverKycWebhook(@RealIP() ip: string, @Body() data: KycDataDto) {
    this.checkWebhookIp(ip, data);
  }

  private checkWebhookIp(ip: string, data: any) {
    if (!Config.kyc.allowedWebhookIps.includes('*') && !Config.kyc.allowedWebhookIps.includes(ip)) {
      console.error(`Received webhook call from invalid IP ${ip}:`, data);
      throw new ForbiddenException('Invalid source IP');
    }
  }
}
