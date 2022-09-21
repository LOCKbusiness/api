import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from '../../application/services/wallet.service';
import { Config } from 'src/config/config';
import { RealIP } from 'nestjs-real-ip';
import { KycDataDto, KycWebhookDto } from '../../application/dto/kyc-data.dto';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { KycService } from '../../application/services/kyc.service';
import { KycDto } from '../../application/dto/kyc.dto';
import { UserService } from '../../application/services/user.service';
import { KycResult } from '../../domain/enums';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(
    private readonly walletService: WalletService,
    private readonly kycService: KycService,
    private readonly userService: UserService,
  ) {}

  // --- KYC USER --- //

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: KycDto })
  async startKyc(@GetJwt() jwt: JwtPayload): Promise<KycDto> {
    return this.kycService.startKyc(jwt.userId);
  }

  // --- KYC SERVICE--- //

  @Get('kycId')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async getKycId(@RealIP() ip: string, @Query('address') address: string): Promise<{ kycId: string }> {
    this.checkIp(ip, address);
    return { kycId: await this.walletService.getKycIdByAddress(address) };
  }

  @Post('handoverKyc')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async handoverKycWebhook(@RealIP() ip: string, @Body() dto: KycWebhookDto) {
    this.checkIp(ip, dto.data);
    if (dto.result === KycResult.STATUS_CHANGED) {
      const user = await this.userService.getUserByKycId(+dto.data.kycId);
      this.userService.updateUser(user.id, dto.data);
    }
  }

  private checkIp(ip: string, data: any) {
    if (!Config.kyc.allowedWebhookIps.includes('*') && !Config.kyc.allowedWebhookIps.includes(ip)) {
      console.error(`Received webhook call from invalid IP ${ip}:`, data);
      throw new ForbiddenException('Invalid source IP');
    }
  }
}
