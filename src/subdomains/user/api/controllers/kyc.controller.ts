import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from '../../application/services/wallet.service';
import { Config } from 'src/config/config';
import { RealIP } from 'nestjs-real-ip';
import { KycDataDto } from '../../application/dto/kyc-data.dto';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { KycService } from '../../application/services/kyc.service';
import { User } from '../../domain/entities/user.entity';
import { KycDto } from '../../application/dto/kyc.dto';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private readonly walletService: WalletService, private readonly kycService: KycService) {}

  // --- KYC USER --- //

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: KycDto, isArray: false })
  async startKyc(@GetJwt() jwt: JwtPayload): Promise<User> {
    return this.kycService.startKyc(jwt.address);
  }

  // --- KYC SERVICE--- //

  @Get('kycId')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async getKycId(@RealIP() ip: string, address: string): Promise<{ kycId: string }> {
    this.checkIp(ip, address);
    return { kycId: await this.walletService.getKycIdByAddress(address) };
  }

  @Post('handoverKyc')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async handoverKycWebhook(@RealIP() ip: string, @Body() data: KycDataDto) {
    this.checkIp(ip, data);
  }

  private checkIp(ip: string, data: any) {
    if (!Config.kyc.allowedWebhookIps.includes('*') && !Config.kyc.allowedWebhookIps.includes(ip)) {
      console.error(`Received webhook call from invalid IP ${ip}:`, data);
      throw new ForbiddenException('Invalid source IP');
    }
  }
}
