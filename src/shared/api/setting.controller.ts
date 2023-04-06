import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeController, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from '../auth/wallet-role.enum';
import { Setting } from '../entities/setting.entity';
import { SettingService } from '../services/setting.service';

@ApiTags('Setting')
@Controller('setting')
@ApiExcludeController()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  // --- ADMIN --- //
  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getSettings(): Promise<Setting[]> {
    return this.settingService.getAll();
  }

  @Put(':key')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async updateSetting(@Param('key') key: string, @Body() { value }: { value: string }): Promise<void> {
    return this.settingService.set(key, value);
  }
}
