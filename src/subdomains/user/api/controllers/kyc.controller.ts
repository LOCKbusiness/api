import { Body, Controller, ForbiddenException, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from '../../application/services/wallet.service';
import { Config } from 'src/config/config';
import { RealIP } from 'nestjs-real-ip';
import { KycWebhookDto } from '../../application/dto/kyc-data.dto';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { KycService } from '../../application/services/kyc.service';
import { KycDto } from '../../application/dto/kyc.dto';
import { UserService } from '../../application/services/user.service';
import { KycResult, KycStatus } from '../../domain/enums';
import { KycCompleted } from '../../domain/utils';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { MailType } from 'src/integration/notification/enums';

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(
    private readonly walletService: WalletService,
    private readonly kycService: KycService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  // --- KYC USER --- //

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiCreatedResponse({ type: KycDto })
  async startKyc(@GetJwt() jwt: JwtPayload): Promise<KycDto> {
    return this.kycService.startKyc(jwt.userId);
  }

  // --- KYC SERVICE--- //

  @Get('check')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async getKycId(@RealIP() ip: string, @Query('address') address: string): Promise<{ kycId: string }> {
    this.checkIp(ip, address);
    return { kycId: await this.walletService.getKycIdByAddress(address) };
  }

  @Post('update')
  @UseGuards(AuthGuard('api-key'))
  @ApiExcludeEndpoint()
  async handoverKycWebhook(@RealIP() ip: string, @Body() dto: KycWebhookDto) {
    this.checkIp(ip, dto.data);

    const user = await this.userService.getUserByKycId(dto.id);
    if (!user) throw new NotFoundException('User not found');

    switch (dto.result) {
      case KycResult.STATUS_CHANGED:
        // ignore rejected KYC, if already completed
        if (user.hasKyc && dto.data.kycStatus === KycStatus.REJECTED) {
          console.info('Ignored rejected KYC because KYC is already completed');
          return;
        }

        // update
        const previousKycStatus = user.kycStatus;
        const updatedUser = await this.userService.updateUser(user.id, dto.data);

        // send notification on KYC completed
        if (previousKycStatus === KycStatus.NA && KycCompleted(dto.data.kycStatus)) {
          if (updatedUser.mail) {
            await this.notificationService.sendMail({
              type: MailType.USER,
              input: {
                translationKey: 'mail.kyc.success',
                translationParams: { name: updatedUser.firstName },
                user: updatedUser,
              },
            });
          } else {
            console.error(`Failed to send KYC completion mail for user ${updatedUser.id}: user has no email`);
          }
        }
        break;

      case KycResult.FAILED:
        if (user.mail) {
          await this.notificationService.sendMail({
            type: MailType.USER,
            input: {
              user,
              translationKey: 'mail.kyc.failed',
              translationParams: {
                url: Config.kyc.frontendUrl(user.kycHash),
              },
            },
          });
        } else {
          console.error(`Failed to send KYC failed mail for user ${user.id}: user has no email`);
        }

        // notify support
        await this.notificationService.sendMail({ type: MailType.KYC_SUPPORT, input: { user } });
        console.error(`Received KYC failed webhook for user with KYC ID ${dto.id}`);
        break;

      default:
        console.error(`Received KYC webhook with invalid result ${dto.result}`);
    }
  }

  private checkIp(ip: string, data: any) {
    if (!Config.kyc.allowedWebhookIps.includes('*') && !Config.kyc.allowedWebhookIps.some((ai) => ip.includes(ai))) {
      console.error(`Received webhook call from invalid IP ${ip}:`, data);
      throw new ForbiddenException('Invalid source IP');
    }
  }
}
