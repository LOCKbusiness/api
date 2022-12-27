import { Body, Controller, ForbiddenException, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from '../../application/services/wallet.service';
import { Config } from 'src/config/config';
import { RealIP } from 'nestjs-real-ip';
import { WebhookDto, WebhookType } from '../../application/dto/webhook-data.dto';
import { UserService } from '../../application/services/user.service';
import { KycStatus } from '../../domain/enums';
import { KycCompleted } from '../../domain/utils';
import { NotificationService } from 'src/integration/notification/services/notification.service';
import { MailType } from 'src/integration/notification/enums';
import { KycWebhookData } from '../../application/dto/kyc-webhook.dto';

@Controller('dfx')
export class DfxController {
  constructor(
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  // --- DFX SERVICE--- //

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
  async handoverDfxWebhook(@RealIP() ip: string, @Body() dto: WebhookDto) {
    this.checkIp(ip, dto.data);

    const user = await this.userService.getUserByKycId(dto.id);
    if (!user) throw new NotFoundException('User not found');

    switch (dto.type) {
      case WebhookType.KYC_CHANGED:
        const data = dto.data as KycWebhookData;
        // ignore rejected KYC, if already completed
        if (user.hasKyc && data.kycStatus === KycStatus.REJECTED) {
          console.info('Ignored rejected KYC because KYC is already completed');
          return;
        }

        // update
        const previousKycStatus = user.kycStatus;
        const updatedUser = await this.userService.updateUser(user.id, data);

        // send notification on KYC completed
        if (previousKycStatus === KycStatus.NA && KycCompleted(data.kycStatus)) {
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

      case WebhookType.KYC_FAILED:
        if (user.mail) {
          await this.notificationService.sendMail({
            type: MailType.USER,
            input: {
              user,
              translationKey: 'mail.kyc.failed',
              translationParams: {
                url: Config.kyc.frontendUrl(user.kycHash),
                name: user.firstName,
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

      case WebhookType.PAYMENT:
        break;

      default:
        console.error(`Received DFX webhook with invalid type ${dto.type}`);
    }
  }

  private checkIp(ip: string, data: any) {
    if (!Config.kyc.allowedWebhookIps.includes('*') && !Config.kyc.allowedWebhookIps.some((ai) => ip.includes(ai))) {
      console.error(`Received webhook call from invalid IP ${ip}:`, data);
      throw new ForbiddenException('Invalid source IP');
    }
  }
}
